import {
  BusArrival,
  BusAlarm,
  EMTAuthCredentials,
  EMTAuthStatus,
  LineArrivalGroup,
  Stop,
} from '../types/emt';
import { findStopInCatalog } from '../data/madridStops';

const CREDENTIALS_KEY = 'emt_madrid_credentials';
const SAVED_STOPS_KEY = 'emt_madrid_saved_stops';
const DEMO_PREVIEW_KEY = 'emt_madrid_preview_mode';
const SAVED_ALARMS_KEY = 'emt_madrid_bus_alarms';

// 1. Gestión de credenciales
export function getSavedCredentials(): EMTAuthCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: EMTAuthCredentials): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error('Error guardando credenciales en localStorage', e);
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch (e) {
    console.error('Error limpiando credenciales', e);
  }
}

export function isPreviewModeActive(): boolean {
  try {
    return localStorage.getItem(DEMO_PREVIEW_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPreviewModeActive(active: boolean): void {
  try {
    localStorage.setItem(DEMO_PREVIEW_KEY, active ? 'true' : 'false');
  } catch (e) {
    console.error(e);
  }
}

// 1.1 Gestión de alarmas con sonido
export function getSavedAlarms(): BusAlarm[] {
  try {
    const raw = localStorage.getItem(SAVED_ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms: BusAlarm[]): void {
  try {
    localStorage.setItem(SAVED_ALARMS_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.error('Error guardando alarmas en localStorage', e);
  }
}

// 2. Gestión de paradas guardadas
export function getSavedStops(): Stop[] {
  try {
    const raw = localStorage.getItem(SAVED_STOPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStops(stops: Stop[]): void {
  try {
    // Guardamos solo los datos estáticos de la parada para no inflar localStorage
    const minimalStops = stops.map(s => ({
      stopId: s.stopId,
      stopName: s.stopName,
      stopAddress: s.stopAddress,
      lines: s.lines,
      coordinates: s.coordinates,
      customAlias: s.customAlias,
      isFavorite: s.isFavorite,
      addedAt: s.addedAt,
    }));
    localStorage.setItem(SAVED_STOPS_KEY, JSON.stringify(minimalStops));
  } catch (e) {
    console.error('Error guardando paradas en localStorage', e);
  }
}

// 3. API backend calls
export async function checkServerAuthStatus(): Promise<EMTAuthStatus> {
  try {
    const res = await fetch('/api/emt/status');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      configured: data.configured,
      hasEnvCredentials: data.hasEnvCredentials,
      tokenActive: data.tokenActive,
      userEmail: data.userEmail,
      userClientId: data.userClientId,
      tokenSecRemaining: data.tokenSecRemaining,
      lastVerifiedAt: Date.now(),
    };
  } catch (err) {
    const saved = getSavedCredentials();
    return {
      configured: Boolean(saved?.accessToken || saved?.email || saved?.clientId),
      hasEnvCredentials: false,
      tokenActive: Boolean(saved?.accessToken),
      userEmail: saved?.email ? `${saved.email.slice(0, 3)}***` : undefined,
    };
  }
}

export async function authenticateWithEMT(creds: EMTAuthCredentials): Promise<{
  success: boolean;
  message: string;
  accessToken?: string;
}> {
  const res = await fetch('/api/emt/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(creds),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Error al autenticar con EMT MobilityLabs');
  }

  saveCredentials({
    ...creds,
    accessToken: data.accessToken,
    tokenExpiration: Date.now() + (data.expiresInSec || 86400) * 1000,
  });

  return {
    success: true,
    message: data.message || 'Conectado exitosamente con la API de EMT Madrid',
    accessToken: data.accessToken,
  };
}

// 4. Obtener tiempos de llegada reales de la parada (dataset 900029-0-emt-autobus-tiempo-real)
export async function fetchStopArrivals(stopId: string): Promise<{
  arrivals: BusArrival[];
  groupedArrivals: LineArrivalGroup[];
  stopName?: string;
  stopAddress?: string;
  coordinates?: [number, number];
  isDemoData: boolean;
}> {
  const savedCreds = getSavedCredentials();
  const headers: Record<string, string> = {};
  if (savedCreds?.accessToken) {
    headers['x-emt-token'] = savedCreds.accessToken;
  }

  try {
    const res = await fetch(`/api/emt/stops/${stopId}/arrivals`, {
      headers,
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const arrivals: BusArrival[] = data.arrivals || [];
      const grouped = groupArrivalsByLine(arrivals);
      return {
        arrivals,
        groupedArrivals: grouped,
        stopName: data.stopName,
        coordinates: data.coordinates,
        isDemoData: false,
      };
    }

    // Si falló por falta de credenciales o token
    if (data.error === 'NO_CREDENTIALS' || data.error === 'TOKEN_EXPIRED') {
      // Si el modo de vista previa está activo, generamos simulación realista basada en catálogo
      if (isPreviewModeActive()) {
        const preview = generateRealisticArrivals(stopId);
        return {
          ...preview,
          isDemoData: true,
        };
      }

      throw new Error(
        'REQUIRES_CREDENTIALS: La API oficial de EMT Madrid (dataset 900029-0) requiere credenciales gratuitas de MobilityLabs para mostrar tiempos en tiempo real.'
      );
    }

    throw new Error(data.message || `Error al obtener tiempos de la parada ${stopId}`);
  } catch (err: any) {
    if (err.message && err.message.startsWith('REQUIRES_CREDENTIALS')) {
      throw err;
    }

    if (isPreviewModeActive()) {
      const preview = generateRealisticArrivals(stopId);
      return {
        ...preview,
        isDemoData: true,
      };
    }

    throw err;
  }
}

// Agrupa las llegadas de autobuses por línea y calcula el próximo y el segundo bus
export function groupArrivalsByLine(arrivals: BusArrival[]): LineArrivalGroup[] {
  const map = new Map<string, BusArrival[]>();

  for (const arr of arrivals) {
    const key = `${arr.line}-${arr.destination}`;
    const list = map.get(key) || [];
    list.push(arr);
    map.set(key, list);
  }

  const groups: LineArrivalGroup[] = [];

  map.forEach((lineArrivals) => {
    // Ordenar de menor a mayor tiempo
    lineArrivals.sort((a, b) => a.estimateArriveSec - b.estimateArriveSec);

    const first = lineArrivals[0];
    const second = lineArrivals[1];

    groups.push({
      line: first.line,
      destination: first.destination,
      arrivals: lineArrivals,
      nextBusMin: first.estimateArriveMin,
      secondBusMin: second ? second.estimateArriveMin : null,
      minDistanceMeters: first.distanceMeters,
    });
  });

  // Ordenar los grupos por el tiempo de llegada del bus más próximo
  return groups.sort((a, b) => {
    const timeA = a.nextBusMin ?? 999;
    const timeB = b.nextBusMin ?? 999;
    return timeA - timeB;
  });
}

// Generador de simulación basada en horarios oficiales de EMT Madrid (para modo preview sin credenciales)
function generateRealisticArrivals(stopId: string): {
  arrivals: BusArrival[];
  groupedArrivals: LineArrivalGroup[];
  stopName?: string;
  stopAddress?: string;
  coordinates?: [number, number];
} {
  const catalogStop = findStopInCatalog(stopId);
  const stopName = catalogStop?.name || `Parada ${stopId}`;
  const stopAddress = catalogStop?.address || 'Madrid';
  const lines = catalogStop?.lines && catalogStop.lines.length > 0
    ? catalogStop.lines
    : ['27', '14', 'C1'];

  const arrivals: BusArrival[] = [];
  const baseStopCoords = catalogStop?.coordinates || [-3.692, 40.42];

  lines.slice(0, 5).forEach((line, index) => {
    // Primer autobús: entre 45s y 7 min
    const sec1 = 45 + (index * 130 + (stopId.charCodeAt(0) * 17) % 240);
    const dist1 = Math.round(sec1 * 3.8 + 120);

    // Variación pequeña de coordenadas alrededor de la parada
    const bus1Coords: [number, number] = [
      baseStopCoords[0] + (Math.sin(index + sec1) * 0.004),
      baseStopCoords[1] + (Math.cos(index + sec1) * 0.004),
    ];

    arrivals.push({
      line,
      destination: getSampleDestination(line),
      busId: 5000 + ((Number(stopId) * 13 + index * 97) % 3500),
      estimateArriveSec: sec1,
      estimateArriveMin: Math.round(sec1 / 60),
      distanceMeters: dist1,
      coordinates: bus1Coords,
      deviation: index % 2 === 0 ? 0 : 1,
      isHead: false,
    });

    // Segundo autobús: entre 8 min y 18 min
    const sec2 = sec1 + 420 + (index * 90);
    arrivals.push({
      line,
      destination: getSampleDestination(line),
      busId: 6000 + ((Number(stopId) * 19 + index * 43) % 2500),
      estimateArriveSec: sec2,
      estimateArriveMin: Math.round(sec2 / 60),
      distanceMeters: Math.round(sec2 * 4.2),
      isHead: false,
    });
  });

  arrivals.sort((a, b) => a.estimateArriveSec - b.estimateArriveSec);

  return {
    arrivals,
    groupedArrivals: groupArrivalsByLine(arrivals),
    stopName,
    stopAddress,
    coordinates: catalogStop?.coordinates,
  };
}

function getSampleDestination(line: string): string {
  const destinations: Record<string, string> = {
    '1': 'PROSPERIDAD',
    '2': 'REINA MERCEDES',
    '3': 'SAN AMARO',
    '5': 'CHAMARTIN',
    '10': 'PALOMERAS',
    '14': 'PÍO XII',
    '15': 'LA ELIPA',
    '20': 'PAVONES',
    '21': 'BARRIO DE EL SALVADOR',
    '27': 'PLAZA DE CASTILLA',
    '34': 'LAS ÁGUILAS',
    '37': 'CUATRO CAMINOS',
    '45': 'REINA VICTORIA',
    '46': 'MONCLOA',
    '50': 'AVDA. MANZANARES',
    '51': 'PLAZA PERÚ',
    '52': 'SANTAMARCA',
    '53': 'ARTURO SORIA',
    '72': 'HORTALEZA',
    '74': 'PARQUE DE LAS AVENIDAS',
    '146': 'LOS MOLINOS',
    '147': 'BARRIO DEL PILAR',
    '150': 'VIRGEN DEL CORTIJO',
    '001': 'MONCLOA',
    '002': 'ARGÜELLES',
    'C1': 'CIRCULAR 1',
    'C2': 'CIRCULAR 2',
    'C03': 'ARGÜELLES',
    '200': 'AEROPUERTO T4',
    '203': 'EXPRÉS AEROPUERTO',
    'E1': 'LA PESETA',
  };

  return destinations[line] || 'FIN DE LÍNEA';
}
