import React, { useState } from 'react';
import {
  RefreshCw,
  Trash2,
  MapPin,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Bus,
  Clock,
  Sparkles,
  Bell,
} from 'lucide-react';
import { Stop, BusArrival, BusAlarm } from '../types/emt';
import { BusArrivalItem } from './BusArrivalItem';

interface StopCardProps {
  stop: Stop;
  onRefresh: (stopId: string) => void;
  onDelete: (stopId: string) => void;
  onUpdateAlias: (stopId: string, alias: string) => void;
  onOpenMap: (stop: Stop, selectedBus?: BusArrival) => void;
  activeAlarms?: BusAlarm[];
  onSetAlarm?: (stop: Stop, line: string, destination?: string) => void;
}

export const StopCard: React.FC<StopCardProps> = ({
  stop,
  onRefresh,
  onDelete,
  onUpdateAlias,
  onOpenMap,
  activeAlarms = [],
  onSetAlarm,
}) => {
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(stop.customAlias || '');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);

  const handleSaveAlias = () => {
    onUpdateAlias(stop.stopId, aliasInput.trim());
    setIsEditingAlias(false);
  };

  // Filtrado de llegadas por línea seleccionada
  const displayedArrivals = (stop.arrivals || []).filter((arr) => {
    if (!selectedLineFilter) return true;
    return arr.line === selectedLineFilter;
  });

  // Lista única de líneas presentes en las llegadas para los chips de filtro
  const availableLines = Array.from(
    new Set((stop.arrivals || []).map((a) => a.line))
  );

  // Calcular segundos desde la última actualización
  const secondsSinceUpdate = stop.lastUpdated
    ? Math.max(0, Math.floor((Date.now() - stop.lastUpdated) / 1000))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Cabecera de la parada */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-slate-50/50 to-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badge de número de parada y alias */}
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-[#005696] text-white shadow-xs">
                PARADA {stop.stopId}
              </span>

              {isEditingAlias ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="Ej. Casa, Trabajo..."
                    className="text-xs px-2 py-0.5 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAlias}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Guardar nombre personalizado"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setAliasInput(stop.customAlias || '');
                      setIsEditingAlias(false);
                    }}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                stop.customAlias && (
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{stop.customAlias}</span>
                    <button
                      onClick={() => setIsEditingAlias(true)}
                      className="text-slate-400 hover:text-slate-700"
                      title="Editar nombre personalizado"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )
              )}

              {stop.isDemoData && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Modo Vista Previa EMT
                </span>
              )}
            </div>

            {/* Nombre oficial de la parada */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
              {stop.stopName || `Parada EMT ${stop.stopId}`}
            </h3>

            {/* Dirección / Ubicación física */}
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{stop.stopAddress || 'Madrid'}</span>
            </div>
          </div>

          {/* Acciones de la parada */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Poner alarma para esta parada */}
            {onSetAlarm && (
              <button
                onClick={() => onSetAlarm(stop, displayedArrivals[0]?.line || stop.lines[0] || '')}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  activeAlarms.some((a) => a.stopId === stop.stopId)
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title="Poner alarma con sonido para un autobús de esta parada"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Abrir mapa de la parada */}
            <button
              onClick={() => onOpenMap(stop)}
              className="p-2 rounded-lg text-slate-500 hover:text-[#005696] hover:bg-blue-50 transition-colors"
              title="Ver parada y posición de autobuses en el mapa"
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* Editar alias si no tiene */}
            {!stop.customAlias && !isEditingAlias && (
              <button
                onClick={() => setIsEditingAlias(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Añadir alias personalizado (ej. Casa, Trabajo)"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Botón recargar esta parada */}
            <button
              onClick={() => onRefresh(stop.stopId)}
              disabled={stop.isLoading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="Actualizar tiempos de esta parada"
            >
              <RefreshCw
                className={`w-4 h-4 ${stop.isLoading ? 'animate-spin text-[#005696]' : ''}`}
              />
            </button>

            {/* Botón eliminar parada */}
            <button
              onClick={() => onDelete(stop.stopId)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Eliminar parada de la lista"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtros por línea */}
        {availableLines.length > 1 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              Líneas:
            </span>
            <button
              onClick={() => setSelectedLineFilter(null)}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                selectedLineFilter === null
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({stop.arrivals?.length || 0})
            </button>
            {availableLines.map((line) => (
              <button
                key={line}
                onClick={() =>
                  setSelectedLineFilter(
                    selectedLineFilter === line ? null : line
                  )
                }
                className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 transition-colors ${
                  selectedLineFilter === line
                    ? 'bg-[#005696] text-white shadow-xs'
                    : 'bg-blue-50 text-[#005696] hover:bg-blue-100'
                }`}
              >
                {line}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenido: Listado de tiempos de espera en tiempo real */}
      <div className="p-4 flex-1">
        {stop.isLoading && !stop.arrivals ? (
          // Shimmer de carga
          <div className="space-y-2.5 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
          </div>
        ) : stop.error ? (
          // Estado de error
          <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-100 text-center">
            <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
            <div className="text-xs font-semibold text-rose-900">
              {stop.error.includes('REQUIRES_CREDENTIALS')
                ? 'Se requiere clave de API de EMT MobilityLabs'
                : 'Error al consultar la parada'}
            </div>
            <p className="text-[11px] text-rose-700 mt-1 max-w-sm mx-auto">
              {stop.error.includes('REQUIRES_CREDENTIALS')
                ? 'El Ayuntamiento de Madrid requiere credenciales gratuitas de MobilityLabs para el dataset 900029-0.'
                : stop.error}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => onRefresh(stop.stopId)}
                className="px-3 py-1 bg-white border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg hover:bg-rose-50 transition-colors shadow-2xs"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : displayedArrivals.length === 0 ? (
          // Sin autobuses activos
          <div className="py-8 text-center text-slate-400">
            <Bus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-xs font-semibold text-slate-700">
              Sin autobuses en aproximación
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
              No hay llegadas programadas en los próximos 45 minutos para esta parada.
            </p>
          </div>
        ) : (
          // Lista de llegadas
          <div className="space-y-2">
            {displayedArrivals.map((arr, idx) => {
              // Buscar si hay un segundo bus para la misma línea
              const otherBusesOfLine = displayedArrivals.filter(
                (a) => a.line === arr.line && a.busId !== arr.busId
              );
              const secondBus = otherBusesOfLine[0];

              const hasAlarmForThisLine = activeAlarms.some(
                (a) => a.stopId === stop.stopId && a.line === arr.line
              );

              return (
                <BusArrivalItem
                  key={`${arr.line}-${arr.busId}-${idx}`}
                  arrival={arr}
                  secondBusMin={secondBus ? secondBus.estimateArriveMin : null}
                  onViewOnMap={(arrival) => onOpenMap(stop, arrival)}
                  hasActiveAlarm={hasAlarmForThisLine}
                  onSetAlarm={() => onSetAlarm?.(stop, arr.line, arr.destination)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pie de la tarjeta */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>
            {secondsSinceUpdate !== null
              ? `Actualizado hace ${secondsSinceUpdate}s`
              : 'Consultando en tiempo real...'}
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          datos.madrid.es #900029-0
        </div>
      </div>
    </div>
  );
};
