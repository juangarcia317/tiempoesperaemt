import React, { useState } from 'react';
import { BusArrival } from '../types/emt';
import { getLineBadgeTheme, formatArrivalTime } from '../data/madridStops';
import {
  MapPin,
  ChevronDown,
  Navigation,
  Clock,
  Sparkles,
  Bell,
} from 'lucide-react';

interface BusArrivalItemProps {
  arrival: BusArrival;
  secondBusMin: number | null;
  onViewOnMap?: (arrival: BusArrival) => void;
  hasActiveAlarm?: boolean;
  onSetAlarm?: (arrival: BusArrival) => void;
}

export const BusArrivalItem: React.FC<BusArrivalItemProps> = ({
  arrival,
  secondBusMin,
  onViewOnMap,
  hasActiveAlarm = false,
  onSetAlarm,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeTheme = getLineBadgeTheme(arrival.line);
  const timeFormatted = formatArrivalTime(arrival.estimateArriveSec);

  const getUrgencyBadgeClasses = () => {
    switch (timeFormatted.urgency) {
      case 'imminent':
        return 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 animate-pulse';
      case 'soon':
        return 'bg-emerald-600 text-white';
      case 'moderate':
        return 'bg-[#005696] text-white';
      case 'distant':
      default:
        return 'bg-slate-200 text-slate-800';
    }
  };

  return (
    <div className="border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        {/* Línea e información de destino */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-12 h-10 rounded-lg ${badgeTheme.bg} ${badgeTheme.text} ${
              badgeTheme.border || ''
            } flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-xs`}
            title={`Línea ${arrival.line} (${badgeTheme.badgeType})`}
          >
            {arrival.line}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span>Destino</span>
              <span>&rarr;</span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate leading-tight uppercase">
              {arrival.destination || 'Fin de recorrido'}
            </div>
            {/* Distancia y bus */}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
              {arrival.distanceMeters !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  <span>
                    {arrival.distanceMeters < 1000
                      ? `${arrival.distanceMeters} m`
                      : `${(arrival.distanceMeters / 1000).toFixed(1)} km`}
                  </span>
                </span>
              )}
              {arrival.busId > 0 && (
                <span className="text-slate-400 font-mono text-[10px]">
                  • Bus #{arrival.busId}
                </span>
              )}
              {arrival.coordinates && (
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-emerald-100 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                  <span>GPS vivo</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tiempo de llegada principal y botón de alarma */}
        <div className="flex items-center gap-2 shrink-0">
          {onSetAlarm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetAlarm(arrival);
              }}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                hasActiveAlarm
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
              }`}
              title={
                hasActiveAlarm
                  ? 'Alarma activa para esta línea (clic para gestionar)'
                  : 'Poner alarma con sonido para esta línea'
              }
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col items-end">
            <div
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm tracking-tight ${getUrgencyBadgeClasses()}`}
            >
              {timeFormatted.displayText}
            </div>

            {/* Tiempo del siguiente autobús (segundo en ruta) */}
            {secondBusMin !== null && (
              <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Siguiente: {secondBusMin} min</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel expandible con detalles técnicos de telemetría EMT */}
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Vehículo</span>
              <span className="font-bold font-mono text-slate-800">
                {arrival.busId > 0 ? `#${arrival.busId}` : 'No disponible'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Distancia</span>
              <span className="font-bold text-slate-800">
                {arrival.distanceMeters !== undefined
                  ? `${arrival.distanceMeters} metros`
                  : 'En parada'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Tiempo exacto</span>
              <span className="font-bold font-mono text-slate-800">
                {arrival.estimateArriveSec < 999999
                  ? `${Math.floor(arrival.estimateArriveSec / 60)}m ${
                      arrival.estimateArriveSec % 60
                    }s`
                  : '> 20 min'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Desviación</span>
              <span className="font-bold text-slate-800">
                {arrival.deviation ? `${arrival.deviation} min` : 'En horario'}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            {onSetAlarm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetAlarm(arrival);
                }}
                className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  hasActiveAlarm
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {hasActiveAlarm ? 'Gestionar alarma activa' : 'Configurar alarma con sonido'}
                </span>
              </button>
            )}

            {arrival.coordinates && onViewOnMap && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOnMap(arrival);
                }}
                className="text-xs font-semibold text-[#005696] hover:text-[#004780] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors ml-auto"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Localizar en mapa</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
