import React from 'react';
import {
  Bus,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Bell,
} from 'lucide-react';
import { EMTAuthStatus } from '../types/emt';

interface HeaderProps {
  authStatus: EMTAuthStatus;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  countdown: number;
  onRefreshAll: () => void;
  onToggleAutoRefresh: () => void;
  onOpenCredentials: () => void;
  onOpenAddStop: () => void;
  onOpenInfo: () => void;
  isPreviewMode: boolean;
  activeAlarmsCount?: number;
  onOpenAlarms?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  authStatus,
  isRefreshing,
  autoRefreshEnabled,
  countdown,
  onRefreshAll,
  onToggleAutoRefresh,
  onOpenCredentials,
  onOpenAddStop,
  onOpenInfo,
  isPreviewMode,
  activeAlarmsCount = 0,
  onOpenAlarms,
}) => {
  const isConnected = authStatus.configured || authStatus.tokenActive;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Logo y título de la EMT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005696] flex items-center justify-center text-white shadow-md shadow-blue-900/10">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#005696] text-white">
                  EMT
                </span>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  Tiempos de Espera
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Datos Abiertos Madrid • <span className="font-mono text-[11px] text-slate-600">ID: 900029-0</span>
              </p>
            </div>
          </div>

          {/* Botón móvil para añadir */}
          <button
            onClick={onOpenAddStop}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005696] text-white text-xs font-semibold hover:bg-[#004780] active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>
        </div>

        {/* Barra de control y estado */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Badge de conexión con MobilityLabs */}
          <button
            onClick={onOpenCredentials}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : isPreviewMode
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 animate-pulse'
            }`}
            title="Configurar credenciales de acceso a la API oficial de EMT Madrid"
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>API EMT Conectada</span>
              </>
            ) : isPreviewMode ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Demo • Conectar API</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                <span>Conectar API EMT</span>
              </>
            )}
          </button>

          {/* Toggle de auto-refresco en tiempo real */}
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              autoRefreshEnabled
                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={
              autoRefreshEnabled
                ? `Actualización automática activa (en ${countdown}s)`
                : 'Activar actualización automática en tiempo real'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefreshEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span>
              {autoRefreshEnabled ? `En vivo (${countdown}s)` : 'En pausa'}
            </span>
          </button>

          {/* Botón de Alarmas con sonido */}
          {onOpenAlarms && (
            <button
              onClick={onOpenAlarms}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                activeAlarmsCount > 0
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs animate-pulse'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={
                activeAlarmsCount > 0
                  ? `${activeAlarmsCount} alarma(s) activa(s). Clic para gestionar.`
                  : 'Configurar alarma con sonido para cuando falten X minutos'
              }
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alarmas</span>
              {activeAlarmsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-amber-700 text-[10px] flex items-center justify-center font-black">
                  {activeAlarmsCount}
                </span>
              )}
            </button>
          )}

          {/* Botón manual de refrescar todo */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
            title="Actualizar tiempos de todas las paradas añadidas ahora"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Botón de información del dataset */}
          <button
            onClick={onOpenInfo}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Información sobre la fuente de datos oficial"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
