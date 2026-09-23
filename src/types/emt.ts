/**
 * Tipos de datos para el API de Tiempo Real de la EMT de Madrid
 * Dataset: 900029-0-emt-autobus-tiempo-real (datos.madrid.es / MobilityLabs)
 */

export interface BusArrival {
  line: string;
  destination: string;
  busId: number;
  estimateArriveSec: number; // segundos hasta la llegada (0 = en parada, 999999 = > 20 min)
  estimateArriveMin: number; // minutos calculados
  distanceMeters?: number;
  coordinates?: [number, number]; // [longitud, latitud]
  deviation?: number;
  isHead?: boolean;
  positionType?: string;
  rawTimeText?: string;
}

export interface LineArrivalGroup {
  line: string;
  destination: string;
  arrivals: BusArrival[];
  nextBusMin: number | null;
  secondBusMin: number | null;
  minDistanceMeters?: number;
}

export interface StopLineInfo {
  line: string;
  label: string;
  headerA?: string;
  headerB?: string;
  direction?: 'A' | 'B';
}

export interface Stop {
  stopId: string;
  stopName: string;
  stopAddress: string;
  coordinates?: [number, number]; // [longitud, latitud]
  lines: string[];
  customAlias?: string;
  isFavorite?: boolean;
  addedAt: number;
  // Estado en tiempo real
  arrivals?: BusArrival[];
  groupedArrivals?: LineArrivalGroup[];
  lastUpdated?: number;
  isLoading?: boolean;
  error?: string | null;
  isDemoData?: boolean;
}

export interface EMTAuthCredentials {
  email?: string;
  password?: string;
  clientId?: string;
  passKey?: string;
  accessToken?: string;
  tokenExpiration?: number;
}

export interface EMTAuthStatus {
  configured: boolean;
  hasEnvCredentials: boolean;
  tokenActive: boolean;
  userEmail?: string;
  userClientId?: string;
  tokenSecRemaining?: number;
  lastVerifiedAt?: number;
}

export interface MadridStopCatalogItem {
  stopId: string;
  name: string;
  address: string;
  lines: string[];
  zone?: string;
  coordinates?: [number, number];
}

export interface BusAlarm {
  id: string;
  stopId: string;
  stopName: string;
  line: string;
  destination?: string;
  triggerMinutes: number; // Por ejemplo, 5 minutos
  createdAt: number;
  hasTriggered: boolean;
  lastCheckedMinutes?: number;
}

