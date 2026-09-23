import React from 'react';
import { Bell, VolumeX, Navigation, MapPin } from 'lucide-react';
import { BusAlarm } from '../types/emt';
import { getLineBadgeTheme } from '../data/madridStops';

interface AlarmRingingModalProps {
  alarm: BusAlarm | null;
  currentEstimatedMinutes: number | null;
  onDismiss: () => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  alarm,
  currentEstimatedMinutes,
  onDismiss,
}) => {
  if (!alarm) return null;

  const theme = getLineBadgeTheme(alarm.line);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-amber-400 w-full max-w-md overflow-hidden text-center p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Campana animada y pulsante */}
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
          <div className="w-24 h-24 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/40 relative z-10">
            <Bell className="w-12 h-12 animate-bounce" />
          </div>
        </div>

        {/* Título de aviso */}
        <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-widest mb-2">
          ¡Aviso de Llegada EMT!
        </span>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          ¡Tu autobús se aproxima!
        </h2>

        <p className="text-sm text-slate-600 mt-1">
          La línea que seleccionaste está a punto de llegar a tu parada.
        </p>

        {/* Tarjeta con los datos de la parada y línea */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-12 h-10 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center font-black text-base shadow-sm`}
              >
                {alarm.line}
              </span>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Línea de autobús
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {alarm.destination ? `Destino ${alarm.destination}` : `Línea ${alarm.line}`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Tiempo
              </div>
              <div className="font-mono font-black text-lg text-emerald-600">
                {currentEstimatedMinutes !== null
                  ? currentEstimatedMinutes <= 1
                    ? '< 1 min'
                    : `~ ${currentEstimatedMinutes} min`
                  : `≤ ${alarm.triggerMinutes} min`}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Parada <strong>{alarm.stopId}</strong> • {alarm.stopName}
            </span>
          </div>
        </div>

        {/* Botón principal para apagar y silenciar */}
        <button
          onClick={onDismiss}
          className="mt-6 w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm tracking-wide active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <VolumeX className="w-5 h-5 text-amber-400" />
          <span>Silenciar y Descartar Alarma</span>
        </button>
      </div>
    </div>
  );
};
