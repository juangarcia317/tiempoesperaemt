import React from 'react';
import { Bus, MapPin, Sparkles, KeyRound } from 'lucide-react';
import { MADRID_POPULAR_STOPS } from '../data/madridStops';

interface EmptyStateProps {
  onSelectQuickStop: (stopId: string, name: string) => void;
  onOpenCredentials: () => void;
  hasCredentials: boolean;
  isPreviewMode: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectQuickStop,
  onOpenCredentials,
  hasCredentials,
  isPreviewMode,
}) => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center">
      {/* Ilustración de marquesina EMT */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-blue-200/80 flex items-center justify-center shadow-inner">
          <Bus className="w-10 h-10 text-[#005696]" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Comienza añadiendo una parada de la EMT
      </h2>
      <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
        Introduce el código numérico de cualquier parada de autobús de Madrid en el buscador superior (lo encontrarás en la marquesina o poste de la parada).
      </p>

      {/* Aviso de credenciales o estado */}
      {!hasCredentials && !isPreviewMode && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 max-w-md mx-auto text-xs text-left flex items-start gap-3 shadow-xs">
          <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-950">
              API Oficial de EMT Madrid (Dataset 900029-0)
            </div>
            <div className="text-amber-800 mt-0.5 leading-normal">
              El Portal de Datos Abiertos del Ayuntamiento de Madrid requiere una clave gratuita de MobilityLabs para recibir datos en vivo.
            </div>
            <button
              onClick={onOpenCredentials}
              className="mt-2 font-bold text-[#005696] hover:underline flex items-center gap-1"
            >
              Configurar clave de acceso o activar vista previa &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Sugerencias de paradas emblemáticas */}
      <div className="mt-10 pt-8 border-t border-slate-200">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>O prueba con una parada destacada de Madrid:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
          {MADRID_POPULAR_STOPS.slice(0, 6).map((stop) => (
            <button
              key={stop.stopId}
              onClick={() => onSelectQuickStop(stop.stopId, stop.name)}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#005696] hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-50 text-[#005696] border border-blue-100 group-hover:bg-[#005696] group-hover:text-white transition-colors">
                    Parada {stop.stopId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {stop.zone}
                  </span>
                </div>
                <div className="font-semibold text-sm text-slate-900 mt-2 line-clamp-1 group-hover:text-[#005696] transition-colors">
                  {stop.name}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {stop.address}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {stop.lines.slice(0, 4).map((l) => (
                  <span
                    key={l}
                    className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                  >
                    {l}
                  </span>
                ))}
                {stop.lines.length > 4 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{stop.lines.length - 4}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
