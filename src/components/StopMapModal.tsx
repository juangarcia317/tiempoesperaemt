import React from 'react';
import { X, MapPin, Bus, Navigation, ExternalLink } from 'lucide-react';
import { Stop, BusArrival } from '../types/emt';
import { getLineBadgeTheme } from '../data/madridStops';

interface StopMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: Stop | null;
  selectedBus?: BusArrival;
}

export const StopMapModal: React.FC<StopMapModalProps> = ({
  isOpen,
  onClose,
  stop,
  selectedBus,
}) => {
  if (!isOpen || !stop) return null;

  // Coordenadas de la parada (o fallback al centro de Madrid [40.4168, -3.7038])
  const [stopLon, stopLat] = stop.coordinates || [-3.7038, 40.4168];

  // Si hay un autobús seleccionado con coordenadas, centrar entre parada y autobús
  let targetLat = stopLat;
  let targetLon = stopLon;

  if (selectedBus?.coordinates) {
    targetLon = (stopLon + selectedBus.coordinates[0]) / 2;
    targetLat = (stopLat + selectedBus.coordinates[1]) / 2;
  }

  const delta = 0.006;
  const bbox = `${targetLon - delta},${targetLat - delta},${targetLon + delta},${targetLat + delta}`;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${stopLat}%2C${stopLon}`;

  const busesWithCoords = (stop.arrivals || []).filter(
    (a) => a.coordinates && a.coordinates.length === 2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005696] text-white flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#005696]">
                  PARADA {stop.stopId}
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  {stop.stopName || `Parada ${stop.stopId}`}
                </h3>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {stop.stopAddress || 'Madrid'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mapa embebido de OpenStreetMap */}
        <div className="relative h-80 sm:h-96 w-full bg-slate-100">
          <iframe
            title={`Mapa de la parada ${stop.stopId}`}
            src={osmUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />

          {/* Tarjeta flotante con información de la parada y autobuses en aproximación */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-md border border-slate-200 max-w-xs text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping" />
              <span>Marquesina Parada {stop.stopId}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Coordenadas: {stopLat.toFixed(5)}, {stopLon.toFixed(5)}
            </div>
          </div>
        </div>

        {/* Lista de autobuses aproximándose a esta parada */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 overflow-y-auto max-h-48">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Autobuses en camino a esta parada</span>
            <span className="text-slate-400 font-normal">
              {stop.arrivals?.length || 0} disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(stop.arrivals || []).slice(0, 6).map((arr, idx) => {
              const theme = getLineBadgeTheme(arr.line);
              return (
                <div
                  key={`${arr.line}-${arr.busId}-${idx}`}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-9 h-7 rounded-md ${theme.bg} ${theme.text} flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {arr.line}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {arr.destination}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {arr.busId > 0 ? `Bus #${arr.busId}` : 'En aproximación'}
                        {arr.distanceMeters && ` • ${arr.distanceMeters} m`}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded bg-[#005696] text-white font-mono font-bold text-xs shrink-0">
                    {arr.estimateArriveSec < 60
                      ? '< 1 min'
                      : `${Math.round(arr.estimateArriveSec / 60)} min`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie con enlace externo a Google Maps o Visor Oficial */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#005696] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Abrir parada en Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
