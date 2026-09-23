import React, { useState } from 'react';
import {
  X,
  Bell,
  Volume2,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { BusAlarm, Stop } from '../types/emt';
import { getLineBadgeTheme } from '../data/madridStops';
import {
  audioAlarm,
  requestNotificationPermission,
} from '../utils/audioAlarm';

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Si se abre para una parada/línea específica
  targetStop?: Stop | null;
  targetLine?: string;
  targetDestination?: string;
  // Todas las paradas disponibles para poder seleccionar si se abre de forma genérica
  allStops: Stop[];
  // Lista de alarmas activas
  activeAlarms: BusAlarm[];
  onAddAlarm: (alarm: Omit<BusAlarm, 'id' | 'createdAt' | 'hasTriggered'>) => void;
  onDeleteAlarm: (alarmId: string) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  isOpen,
  onClose,
  targetStop,
  targetLine,
  targetDestination,
  allStops,
  activeAlarms,
  onAddAlarm,
  onDeleteAlarm,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<string>(
    targetStop?.stopId || allStops[0]?.stopId || ''
  );
  const [selectedLine, setSelectedLine] = useState<string>(
    targetLine || ''
  );
  const [minutes, setMinutes] = useState<number>(5);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>(
    targetLine ? 'create' : activeAlarms.length > 0 ? 'list' : 'create'
  );

  if (!isOpen) return null;

  // Actualizar selección cuando cambian las props
  const currentStop =
    allStops.find((s) => s.stopId === selectedStopId) || targetStop || allStops[0];

  // Líneas disponibles en la parada actual
  const linesAtStop = Array.from(
    new Set([
      ...(currentStop?.lines || []),
      ...(currentStop?.arrivals?.map((a) => a.line) || []),
    ])
  );

  const effectiveLine = selectedLine || linesAtStop[0] || '';

  const handleTestSound = () => {
    setIsPlayingTest(true);
    audioAlarm.playChime();
    setTimeout(() => setIsPlayingTest(false), 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStop || !effectiveLine) return;

    // Solicitar permiso de notificación del sistema si aún no se ha pedido
    await requestNotificationPermission();

    onAddAlarm({
      stopId: currentStop.stopId,
      stopName: currentStop.stopName || `Parada ${currentStop.stopId}`,
      line: effectiveLine,
      destination: targetDestination || currentStop.arrivals?.find(a => a.line === effectiveLine)?.destination,
      triggerMinutes: Math.max(1, minutes),
    });

    onClose();
  };

  const lineTheme = getLineBadgeTheme(effectiveLine);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-amber-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Alarma de Autobús con Sonido
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Aviso sonoro automático cuando tu autobús esté llegando
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

        {/* Pestañas (Crear alarma vs Alarmas activas) */}
        <div className="flex border-b border-slate-200 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Configurar Alarma
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Alarmas Activas</span>
            {activeAlarms.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeAlarms.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selector de Parada */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Parada de autobús
                </label>
                {allStops.length > 1 ? (
                  <select
                    value={selectedStopId}
                    onChange={(e) => {
                      setSelectedStopId(e.target.value);
                      setSelectedLine('');
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {allStops.map((s) => (
                      <option key={s.stopId} value={s.stopId}>
                        Parada {s.stopId} — {s.stopName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 flex items-center justify-between">
                    <span>
                      Parada {currentStop?.stopId} — {currentStop?.stopName}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      ID #{currentStop?.stopId}
                    </span>
                  </div>
                )}
              </div>

              {/* Selector de Línea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Línea de autobús
                </label>
                {linesAtStop.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {linesAtStop.map((line) => {
                      const isSelected = line === effectiveLine;
                      const theme = getLineBadgeTheme(line);
                      return (
                        <button
                          key={line}
                          type="button"
                          onClick={() => setSelectedLine(line)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <span
                            className={`w-5 h-4 rounded text-[10px] flex items-center justify-center font-black ${
                              isSelected ? 'bg-white/20 text-white' : `${theme.bg} ${theme.text}`
                            }`}
                          >
                            {line}
                          </span>
                          <span>Línea {line}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={selectedLine}
                    onChange={(e) => setSelectedLine(e.target.value.toUpperCase())}
                    placeholder="Ej. 27, C1, 14..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold uppercase"
                    required
                  />
                )}
              </div>

              {/* Minutos configurables para el aviso */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Avisar con sonido cuando falten:
                  </label>
                  <span className="font-mono font-bold text-amber-600 text-sm bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {minutes} {minutes === 1 ? 'minuto' : 'minutos'}
                  </span>
                </div>

                {/* Botones rápidos de minutos */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[2, 3, 5, 8, 10].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        minutes === m
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>

                {/* Slider para ajuste fino de 1 a 20 minutos */}
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 px-1 font-mono">
                  <span>1 min</span>
                  <span>5 min</span>
                  <span>10 min</span>
                  <span>15 min</span>
                  <span>20 min</span>
                </div>
              </div>

              {/* Botón de prueba de sonido */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sonido de campana de transporte público</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={isPlayingTest}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{isPlayingTest ? 'Sonando...' : 'Probar sonido'}</span>
                </button>
              </div>

              {/* Botón de activación */}
              <button
                type="submit"
                disabled={!effectiveLine}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:scale-98 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>
                  Activar alarma para Línea {effectiveLine} ({minutes} min)
                </span>
              </button>
            </form>
          ) : (
            /* Lista de alarmas activas */
            <div className="space-y-3">
              {activeAlarms.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <div className="text-sm font-semibold text-slate-700">
                    No tienes alarmas programadas
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Configura una alarma para que la aplicación te avise con sonido cuando se aproxime tu autobús.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                  >
                    Crear primera alarma
                  </button>
                </div>
              ) : (
                activeAlarms.map((alarm) => {
                  const theme = getLineBadgeTheme(alarm.line);
                  return (
                    <div
                      key={alarm.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-10 h-8 rounded-lg ${theme.bg} ${theme.text} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                        >
                          {alarm.line}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            Línea {alarm.line} • Parada {alarm.stopId}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {alarm.stopName}
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Avisar cuando falten ≤ {alarm.triggerMinutes} minutos</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteAlarm(alarm.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Eliminar alarma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
