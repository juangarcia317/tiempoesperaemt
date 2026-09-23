# EMT Madrid — Tiempos de Espera en Tiempo Real y Alarmas Sonoras

Aplicación web interactiva para consultar en **tiempo real** los tiempos de llegada de los autobuses de la **EMT de Madrid**, basada en los datos oficiales del **Portal de Datos Abiertos del Ayuntamiento de Madrid** (**Dataset `900029-0-emt-autobus-tiempo-real`** / **EMT MobilityLabs**), con sistema integrado de **alarmas sonoras personalizables** por parada, línea y minutos de antelación.

---

## 🚀 Características Principales

- **Inicio en blanco y personalizable:** La aplicación arranca sin datos predefinidos, permitiéndote añadir cualquier código numérico de poste o marquesina de la EMT (1 a 5900+), buscar por nombre de calle o intercambiador (ej. *Cibeles*, *Atocha*, *Moncloa*, *Gran Vía*), y asignar nombres personalizados (ej. *"Casa"*, *"Oficina"*, *"Universidad"*).
- **Tiempos oficiales en tiempo real:**
  - Minutos y segundos restantes exactos hasta la llegada del vehículo.
  - Distancia física en metros hacia el poste.
  - Identificador de flota del autobús (ej. `#8412`).
  - Estimación del segundo autobús en ruta para la misma línea.
  - Indicador de puntualidad y desviación horaria.
- **🔔 Alarma sonora con Web Audio API:**
  - Configura avisos con sonido para cuando falten **5 minutos** (o el número exacto de minutos que elijas, de 1 a 20 min) para la línea y parada que selecciones.
  - Sonido melódico sintetizado mediante **Web Audio API** (timbre de megafonía de estación de 4 tonos con armónicos y decaimiento natural).
  - No depende de archivos de audio externos (100% autónomo y offline-ready).
  - Soporta patrón de vibración en dispositivos móviles compatibles (`navigator.vibrate`).
  - Integración opcional con la API de notificaciones nativas del navegador para avisarte incluso con la pestaña minimizada.
  - Botón de prueba de sonido integrado en el modal de configuración.
  - Diálogo de aviso visual con botón para silenciar y descartar.
- **🗺️ Mapa interactivo:** Localización geográfica del poste de la parada y de la posición GPS transmitida por los autobuses en aproximación.
- **🔄 Auto-refresco en vivo:** Barra de progreso y temporizador sincronizado a 25 segundos para actualizar automáticamente las estimaciones.
- **💾 Persistencia local:** Paradas guardadas, alias, filtros y alarmas activas se almacenan en `localStorage`.
- **🧪 Modo demostración / Vista previa:** Permite comprobar el funcionamiento de la interfaz con frecuencias oficiales programadas en caso de no disponer de credenciales inmediatas de MobilityLabs.

---

## 📡 Origen de los Datos (Dataset 900029-0)

- **Portal de Datos Abiertos de Madrid:**  
  [Dataset 900029-0: EMT Autobús - Tiempo Real](https://datos.madrid.es/dataset/900029-0-emt-autobus-tiempo-real)
- **Documentación OpenAPI de EMT MobilityLabs:**  
  [https://mobilitylabs.emtmadrid.es/](https://mobilitylabs.emtmadrid.es/)
- **Endpoints oficiales consumidos:**
  - Login y emisión de token: `POST /v2/mobilitylabs/user/login/`
  - Tiempos de paso por parada: `POST /v2/transport/busemtmad/stops/{stopId}/arrives/`
  - Información de líneas y paradas: `GET /v2/transport/busemtmad/stops/{stopId}/detail/`

---

## 🛠️ Arquitectura Técnica

```
├── server.ts                    # Backend Proxy Express (Gestión de token EMT y llamadas seguras)
├── src/
│   ├── App.tsx                  # Componente raíz y orquestador del estado y motor de alarmas
│   ├── main.tsx                 # Entrada React 19
│   ├── types/
│   │   └── emt.ts               # Tipos TypeScript (Stop, BusArrival, BusAlarm, EMTAuthStatus...)
│   ├── services/
│   │   └── emtApi.ts            # Cliente HTTP, almacenamiento local y llamadas a /api/emt/*
│   ├── utils/
│   │   └── audioAlarm.ts        # Sintetizador Web Audio API (timbre de transporte y notificaciones)
│   ├── data/
│   │   └── madridStops.ts       # Catálogo de paradas, colores oficiales de líneas EMT y utilidades
│   └── components/
│       ├── Header.tsx           # Barra superior con estado API, alarmas activas y auto-refresco
│       ├── AddStopBar.tsx       # Buscador y selector rápido de paradas por código o nombre
│       ├── StopCard.tsx         # Tarjeta de parada con llegadas, filtros y botones de alarma
│       ├── BusArrivalItem.tsx   # Fila de autobús con tiempo, distancia, telemetría y alarma directa
│       ├── AlarmModal.tsx       # Modal para configurar minutos y probar sonido de alarma
│       ├── AlarmRingingModal.tsx# Diálogo visual destacado cuando una alarma está sonando
│       ├── StopMapModal.tsx     # Visor de mapa geográfico de la parada y autobuses
│       ├── CredentialsModal.tsx # Panel de conexión con MobilityLabs EMT
│       ├── InfoModal.tsx        # Información del dataset oficial
│       └── EmptyState.tsx       # Pantalla inicial de bienvenida con accesos directos
```

---

## ⚙️ Configuración de Credenciales de EMT MobilityLabs

Para consultar datos 100% en tiempo real, la EMT de Madrid requiere una cuenta gratuita en su plataforma de desarrolladores:

1. Regístrate de forma gratuita en [https://mobilitylabs.emtmadrid.es/](https://mobilitylabs.emtmadrid.es/).
2. Puedes configurar tus credenciales de dos maneras:
   - **Directamente en la aplicación web:** Haz clic en **"Conectar API EMT"** en la barra superior e introduce tu correo y contraseña (o Client ID / PassKey).
   - **Mediante variables de entorno en el servidor (`.env`):**
     ```bash
     EMT_EMAIL="tu-email@ejemplo.com"
     EMT_PASSWORD="tu-contrasena-mobilitylabs"
     ```
     O bien con claves de aplicación:
     ```bash
     EMT_CLIENT_ID="tu-client-id"
     EMT_PASSKEY="tu-passkey"
     ```

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Node.js v18 o superior
- npm v9 o superior

### Pasos

1. Clonar el repositorio o descargar el código:
   ```bash
   git clone <repo-url>
   cd <nombre-directorio>
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:3000`.

4. Compilar para producción:
   ```bash
   npm run build
   ```

5. Iniciar en modo producción:
   ```bash
   npm start
   ```

---

## 🔔 Cómo Funciona la Alarma con Sonido

1. En cualquier tarjeta de parada o línea de autobús, pulsa sobre el icono de campana **🔔**.
2. Selecciona a cuántos minutos de antelación quieres que suene el aviso (por ejemplo, **5 minutos** o el tiempo deseado entre 1 y 20 min).
3. Pulsa **"Probar sonido"** para verificar el volumen en tu equipo o auricular.
4. Pulsa **"Activar alarma"**.
5. Cuando el autobús se encuentre al umbral indicado o menos, sonará una campana melódica continuada y aparecerá el aviso en pantalla con los datos del autobús y la opción de silenciarlo.

---

## 📄 Licencia

Este proyecto está disponible para fines informativos y de consulta del transporte público de Madrid. Los datos de tiempos y líneas son propiedad de la **Empresa Municipal de Transportes de Madrid (EMT)** y del **Ayuntamiento de Madrid**, distribuidos bajo las condiciones de uso del Portal de Datos Abiertos del Ayuntamiento de Madrid.
