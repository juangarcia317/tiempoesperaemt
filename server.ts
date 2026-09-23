import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CachedSession {
  accessToken: string | null;
  expiresAt: number;
  email?: string;
  clientId?: string;
  source: 'env' | 'user' | 'none';
}

const sessionState: CachedSession = {
  accessToken: null,
  expiresAt: 0,
  email: process.env.EMT_EMAIL || undefined,
  clientId: process.env.EMT_CLIENT_ID || undefined,
  source: process.env.EMT_EMAIL || process.env.EMT_CLIENT_ID ? 'env' : 'none',
};

// Intenta autenticar contra el endpoint de Mobility Labs de EMT Madrid
async function authenticateEMT(creds?: {
  email?: string;
  password?: string;
  clientId?: string;
  passKey?: string;
  accessToken?: string;
}): Promise<string> {
  // Si ya nos envían un accessToken directo y no ha expirado
  if (creds?.accessToken) {
    sessionState.accessToken = creds.accessToken;
    sessionState.expiresAt = Date.now() + 12 * 3600 * 1000;
    sessionState.source = 'user';
    return creds.accessToken;
  }

  // Comprobar token en caché
  if (sessionState.accessToken && sessionState.expiresAt > Date.now() + 60000) {
    return sessionState.accessToken;
  }

  const email = creds?.email || process.env.EMT_EMAIL;
  const password = creds?.password || process.env.EMT_PASSWORD;
  const clientId = creds?.clientId || process.env.EMT_CLIENT_ID;
  const passKey = creds?.passKey || process.env.EMT_PASSKEY;

  if (!email && !clientId) {
    throw new Error('NO_CREDENTIALS');
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'EMT-Madrid-MadridOpenData-Client/1.0',
  };

  if (email && password) {
    headers['email'] = email;
    headers['password'] = password;
  } else if (clientId && passKey) {
    headers['X-ClientId'] = clientId;
    headers['passKey'] = passKey;
  } else {
    throw new Error('MISSING_PASSWORD_OR_KEY');
  }

  const loginUrl = 'https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/';
  const res = await fetch(loginUrl, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error HTTP ${res.status} al autenticar en EMT: ${text}`);
  }

  const json = (await res.json()) as any;

  if (json.code !== '01' && json.code !== '00') {
    throw new Error(json.description || `Error de autenticación EMT código ${json.code}`);
  }

  const tokenData = json.data?.[0];
  const accessToken = tokenData?.accessToken;

  if (!accessToken) {
    throw new Error('No se recibió token de acceso en la respuesta de EMT');
  }

  const durationSec = Number(tokenData?.tokenSecExpiration) || 86400;
  sessionState.accessToken = accessToken;
  sessionState.expiresAt = Date.now() + durationSec * 1000;
  if (email) sessionState.email = email;
  if (clientId) sessionState.clientId = clientId;
  sessionState.source = creds?.email || creds?.clientId ? 'user' : 'env';

  return accessToken;
}

async function startServer() {
  const app = express();
  // Dev server must strictly run on port 3000 in AI Studio
  const PORT = 3000;

  app.use(express.json());

  // 1. Estado de autenticación
  app.get('/api/emt/status', (_req: Request, res: Response) => {
    const hasEnv = Boolean(
      (process.env.EMT_EMAIL && process.env.EMT_PASSWORD) ||
      (process.env.EMT_CLIENT_ID && process.env.EMT_PASSKEY)
    );

    const tokenActive = Boolean(
      sessionState.accessToken && sessionState.expiresAt > Date.now()
    );

    res.json({
      configured: tokenActive || hasEnv,
      hasEnvCredentials: hasEnv,
      tokenActive,
      userEmail: sessionState.email ? `${sessionState.email.slice(0, 3)}***@***` : undefined,
      userClientId: sessionState.clientId ? `${sessionState.clientId.slice(0, 4)}***` : undefined,
      tokenSecRemaining: tokenActive ? Math.round((sessionState.expiresAt - Date.now()) / 1000) : 0,
      source: sessionState.source,
    });
  });

  // 2. Autenticar o guardar credenciales
  app.post('/api/emt/auth', async (req: Request, res: Response) => {
    try {
      const { email, password, clientId, passKey, accessToken } = req.body || {};

      const token = await authenticateEMT({
        email,
        password,
        clientId,
        passKey,
        accessToken,
      });

      res.json({
        success: true,
        message: 'Conectado exitosamente con la API de EMT MobilityLabs',
        accessToken: token,
        expiresInSec: Math.round((sessionState.expiresAt - Date.now()) / 1000),
      });
    } catch (err: any) {
      const isNoCreds = err.message === 'NO_CREDENTIALS' || err.message === 'MISSING_PASSWORD_OR_KEY';
      res.status(isNoCreds ? 400 : 401).json({
        success: false,
        error: isNoCreds ? 'MISSING_CREDENTIALS' : 'AUTH_FAILED',
        message: err.message || 'Error al autenticar con EMT MobilityLabs',
      });
    }
  });

  // 3. Desconectar o limpiar sesión
  app.post('/api/emt/disconnect', (_req: Request, res: Response) => {
    sessionState.accessToken = null;
    sessionState.expiresAt = 0;
    sessionState.source = 'none';
    res.json({ success: true });
  });

  // 4. Obtener llegadas en tiempo real para una parada (Dataset 900029-0-emt-autobus-tiempo-real)
  app.get('/api/emt/stops/:stopId/arrivals', async (req: Request, res: Response) => {
    const stopId = String(req.params.stopId).trim();
    const clientToken = req.headers['x-emt-token'] as string | undefined;

    if (!stopId || !/^\d+$/.test(stopId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STOP_ID',
        message: 'El código de parada debe ser un número entero válido (ej. 72, 80, 270)',
      });
    }

    try {
      let token = clientToken || sessionState.accessToken;

      if (!token) {
        try {
          token = await authenticateEMT();
        } catch (authErr: any) {
          return res.status(401).json({
            success: false,
            error: 'NO_CREDENTIALS',
            message:
              'Se requieren credenciales de EMT MobilityLabs Madrid para consultar tiempos reales según especificación del dataset 900029-0-emt-autobus-tiempo-real.',
          });
        }
      }

      // Endpoint oficial v2 según dataset 900029-0-emt-autobus-tiempo-real
      const arrivesUrl = `https://openapi.emtmadrid.es/v2/transport/busemtmad/stops/${stopId}/arrives/`;
      
      let fetchRes = await fetch(arrivesUrl, {
        method: 'POST',
        headers: {
          'accessToken': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          stopId,
          Text_EstimationsRequired_YN: 'Y',
        }),
      });

      // Si el token expiró (código 80 o 401), intentar refrescar una vez
      if (fetchRes.status === 401) {
        try {
          sessionState.accessToken = null;
          token = await authenticateEMT();
          fetchRes = await fetch(arrivesUrl, {
            method: 'POST',
            headers: {
              'accessToken': token,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              stopId,
              Text_EstimationsRequired_YN: 'Y',
            }),
          });
        } catch {
          // continuar con el resultado original
        }
      }

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        return res.status(fetchRes.status).json({
          success: false,
          error: 'EMT_API_ERROR',
          message: `La API de EMT respondió con código ${fetchRes.status}: ${errorText}`,
        });
      }

      const rawData = (await fetchRes.json()) as any;

      // Código "80" en body también significa token no válido
      if (rawData.code === '80') {
        sessionState.accessToken = null;
        return res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'El token de acceso de EMT ha expirado. Por favor reconecta tus credenciales.',
        });
      }

      // Procesar llegadas devueltas por EMT
      const stopData = rawData.data?.[0] || {};
      const arrivesList = stopData.Arrive || [];
      const stopInfoRaw = stopData.StopInfo?.[0] || {};

      const arrivals = arrivesList.map((item: any) => {
        const estimateSec = Number(item.estimateArrive);
        const coords = item.geometry?.coordinates;
        return {
          line: String(item.line),
          destination: String(item.destination || ''),
          busId: Number(item.bus) || 0,
          estimateArriveSec: isNaN(estimateSec) ? 999999 : estimateSec,
          estimateArriveMin: isNaN(estimateSec) ? 999 : Math.round(estimateSec / 60),
          distanceMeters: Number(item.DistanceBus) || undefined,
          coordinates: Array.isArray(coords) && coords.length >= 2 ? [coords[0], coords[1]] : undefined,
          deviation: Number(item.deviation) || 0,
          isHead: item.isHead === 'True' || item.isHead === true,
          positionType: String(item.positionTypeBus || ''),
        };
      });

      // Ordenar llegadas por tiempo estimado ascendente
      arrivals.sort((a: any, b: any) => a.estimateArriveSec - b.estimateArriveSec);

      res.json({
        success: true,
        stopId,
        stopName: stopInfoRaw.stopName || undefined,
        coordinates: stopInfoRaw.geometry?.coordinates || undefined,
        arrivals,
        timestamp: Date.now(),
        datasetId: '900029-0-emt-autobus-tiempo-real',
      });
    } catch (err: any) {
      console.error(`Error en arrivals para parada ${stopId}:`, err);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Error al consultar llegadas de la EMT',
      });
    }
  });

  // 5. Obtener detalles de una parada (líneas, nombre oficial, coordenadas)
  app.get('/api/emt/stops/:stopId/detail', async (req: Request, res: Response) => {
    const stopId = String(req.params.stopId).trim();
    const clientToken = req.headers['x-emt-token'] as string | undefined;

    try {
      let token = clientToken || sessionState.accessToken;
      if (!token) {
        token = await authenticateEMT();
      }

      const detailUrl = `https://openapi.emtmadrid.es/v1/transport/busemtmad/stops/${stopId}/detail/`;
      const fetchRes = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'accessToken': token,
          'Accept': 'application/json',
        },
      });

      if (!fetchRes.ok) {
        return res.status(fetchRes.status).json({
          success: false,
          error: 'DETAIL_FETCH_FAILED',
        });
      }

      const json = (await fetchRes.json()) as any;
      const stopData = json.data?.[0]?.stops?.[0];

      if (!stopData) {
        return res.status(404).json({
          success: false,
          error: 'STOP_NOT_FOUND',
          message: `Parada ${stopId} no encontrada en la red EMT`,
        });
      }

      const lines = (stopData.dataLine || []).map((dl: any) => ({
        line: String(dl.label || dl.line),
        headerA: dl.headerA,
        headerB: dl.headerB,
        direction: dl.direction,
      }));

      res.json({
        success: true,
        stopId,
        name: stopData.name || '',
        address: stopData.postalAddress || '',
        coordinates: stopData.geometry?.coordinates,
        lines,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'ERROR_GET_STOP_DETAIL',
        message: err.message,
      });
    }
  });

  // Configuración de Vite para modo desarrollo y producción
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EMT Madrid] Servidor escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[EMT Madrid] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
