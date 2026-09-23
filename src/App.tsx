import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { AddStopBar } from './components/AddStopBar';
import { StopCard } from './components/StopCard';
import { EmptyState } from './components/EmptyState';
import { CredentialsModal } from './components/CredentialsModal';
import { StopMapModal } from './components/StopMapModal';
import { InfoModal } from './components/InfoModal';
import { AlarmModal } from './components/AlarmModal';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import {
  Stop,
  BusArrival,
  BusAlarm,
  EMTAuthStatus,
  EMTAuthCredentials,
} from './types/emt';
import {
  getSavedStops,
  saveStops,
  getSavedAlarms,
  saveAlarms,
  checkServerAuthStatus,
  authenticateWithEMT,
  clearCredentials,
  fetchStopArrivals,
  isPreviewModeActive,
  setPreviewModeActive,
} from './services/emtApi';
import { findStopInCatalog } from './data/madridStops';
import {
  audioAlarm,
  sendSystemNotification,
} from './utils/audioAlarm';
import { AlertCircle, CheckCircle2, Info, Plus } from 'lucide-react';

const REFRESH_INTERVAL_SECONDS = 25;

export default function App() {
  const [stops, setStops] = useState<Stop[]>(() => getSavedStops());
  const [alarms, setAlarms] = useState<BusAlarm[]>(() => getSavedAlarms());
  const [authStatus, setAuthStatus] = useState<EMTAuthStatus>({
    configured: false,
    hasEnvCredentials: false,
    tokenActive: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SECONDS);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() => isPreviewModeActive());

  // Modales
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapTargetStop, setMapTargetStop] = useState<Stop | null>(null);
  const [mapTargetBus, setMapTargetBus] = useState<BusArrival | undefined>(undefined);

  // Estados de la alarma
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [alarmTargetStop, setAlarmTargetStop] = useState<Stop | null>(null);
  const [alarmTargetLine, setAlarmTargetLine] = useState<string | undefined>(undefined);
  const [alarmTargetDestination, setAlarmTargetDestination] = useState<string | undefined>(undefined);
  const [ringingAlarm, setRingingAlarm] = useState<BusAlarm | null>(null);
  const [ringingEstimatedMinutes, setRingingEstimatedMinutes] = useState<number | null>(null);

  // Notificación flotante
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Inicialización de estado y autenticación
  useEffect(() => {
    async function init() {
      const status = await checkServerAuthStatus();
      setAuthStatus(status);
    }
    init();
  }, []);

  // Guardar en localStorage siempre que cambien las paradas o alarmas
  useEffect(() => {
    saveStops(stops);
  }, [stops]);

  useEffect(() => {
    saveAlarms(alarms);
  }, [alarms]);

  // 1.1 Motor de evaluación de alarmas con sonido
  const checkAlarmsForStop = useCallback(
    (stopId: string, arrivals: BusArrival[]) => {
      setAlarms((prevAlarms) => {
        let triggered = false;
        const updated = prevAlarms.map((alarm) => {
          if (alarm.stopId !== stopId || alarm.hasTriggered) return alarm;

          // Buscar llegadas de la línea específica
          const lineArrivals = arrivals.filter((a) => a.line === alarm.line);
          if (lineArrivals.length === 0) return alarm;

          // Minutos mínimos estimados
          const minMinutes = Math.min(
            ...lineArrivals.map((a) =>
              a.estimateArriveSec < 60 ? 1 : Math.round(a.estimateArriveSec / 60)
            )
          );

          if (minMinutes <= alarm.triggerMinutes) {
            triggered = true;
            // Iniciar timbrado de alarma en bucle (Web Audio API)
            audioAlarm.startAlarmRinging();

            // Notificación nativa del sistema
            sendSystemNotification(
              `¡Autobús Línea ${alarm.line} próximo!`,
              `Llegará a ${alarm.stopName} (Parada ${alarm.stopId}) en menos de ${minMinutes} min.`
            );

            setRingingAlarm(alarm);
            setRingingEstimatedMinutes(minMinutes);

            return {
              ...alarm,
              hasTriggered: true,
              lastCheckedMinutes: minMinutes,
            };
          }

          return {
            ...alarm,
            lastCheckedMinutes: minMinutes,
          };
        });

        return updated;
      });
    },
    []
  );

  // 2. Refrescar una parada específica
  const refreshSingleStop = useCallback(
    async (stopId: string) => {
      setStops((prev) =>
        prev.map((s) => (s.stopId === stopId ? { ...s, isLoading: true, error: null } : s))
      );

      try {
        const res = await fetchStopArrivals(stopId);

        setStops((prev) =>
          prev.map((s) => {
            if (s.stopId !== stopId) return s;
            return {
              ...s,
              arrivals: res.arrivals,
              groupedArrivals: res.groupedArrivals,
              stopName: res.stopName || s.stopName,
              stopAddress: res.stopAddress || s.stopAddress,
              coordinates: res.coordinates || s.coordinates,
              lastUpdated: Date.now(),
              isLoading: false,
              error: null,
              isDemoData: res.isDemoData,
            };
          })
        );

        // Evaluar alarmas programadas para esta parada
        if (res.arrivals && res.arrivals.length > 0) {
          checkAlarmsForStop(stopId, res.arrivals);
        }
      } catch (err: any) {
        setStops((prev) =>
          prev.map((s) => {
            if (s.stopId !== stopId) return s;
            return {
              ...s,
              isLoading: false,
              error: err.message || 'Error al obtener llegadas',
            };
          })
        );
      }
    },
    [checkAlarmsForStop]
  );

  // Refrescar todas las paradas añadidas
  const refreshAllStops = useCallback(async () => {
    if (stops.length === 0) return;
    setIsRefreshing(true);
    setCountdown(REFRESH_INTERVAL_SECONDS);

    try {
      await Promise.all(stops.map((s) => refreshSingleStop(s.stopId)));
    } finally {
      setIsRefreshing(false);
    }
  }, [stops, refreshSingleStop]);

  // Cargar datos iniciales de las paradas guardadas al arrancar
  const hasLoadedInitialData = useRef(false);
  useEffect(() => {
    if (!hasLoadedInitialData.current && stops.length > 0) {
      hasLoadedInitialData.current = true;
      refreshAllStops();
    }
  }, [stops.length, refreshAllStops]);

  // 3. Temporizador de cuenta atrás para actualización en tiempo real
  useEffect(() => {
    if (!autoRefreshEnabled || stops.length === 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshAllStops();
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, stops.length, refreshAllStops]);

  // 4. Añadir parada
  const handleAddStop = async (stopId: string, customName?: string): Promise<boolean> => {
    const cleanId = stopId.trim();

    // Comprobar si ya existe
    if (stops.some((s) => s.stopId === cleanId)) {
      showToast(`La parada ${cleanId} ya está en tu panel`, 'info');
      return false;
    }

    const catalog = findStopInCatalog(cleanId);
    const newStop: Stop = {
      stopId: cleanId,
      stopName: customName || catalog?.name || `Parada ${cleanId}`,
      stopAddress: catalog?.address || 'Madrid',
      lines: catalog?.lines || [],
      coordinates: catalog?.coordinates,
      addedAt: Date.now(),
      isLoading: true,
      error: null,
    };

    setStops((prev) => [newStop, ...prev]);
    showToast(`Parada ${cleanId} añadida a tu lista`, 'success');

    // Consultar inmediatamente sus tiempos en tiempo real
    refreshSingleStop(cleanId);
    return true;
  };

  // 5. Eliminar parada
  const handleDeleteStop = (stopId: string) => {
    setStops((prev) => prev.filter((s) => s.stopId !== stopId));
    // Limpiar alarmas de esta parada
    setAlarms((prev) => prev.filter((a) => a.stopId !== stopId));
    showToast(`Parada ${stopId} eliminada`, 'info');
  };

  // 6. Actualizar alias personalizado
  const handleUpdateAlias = (stopId: string, alias: string) => {
    setStops((prev) =>
      prev.map((s) => (s.stopId === stopId ? { ...s, customAlias: alias || undefined } : s))
    );
    showToast(`Nombre personalizado actualizado`, 'success');
  };

  // 7. Abrir mapa
  const handleOpenMap = (stop: Stop, selectedBus?: BusArrival) => {
    setMapTargetStop(stop);
    setMapTargetBus(selectedBus);
    setIsMapModalOpen(true);
  };

  // 8. Gestión de Alarmas con Sonido
  const handleOpenAlarmModal = (stop?: Stop | null, line?: string, destination?: string) => {
    setAlarmTargetStop(stop || null);
    setAlarmTargetLine(line);
    setAlarmTargetDestination(destination);
    setIsAlarmModalOpen(true);
  };

  const handleAddAlarm = (alarmData: Omit<BusAlarm, 'id' | 'createdAt' | 'hasTriggered'>) => {
    const newAlarm: BusAlarm = {
      ...alarmData,
      id: `${alarmData.stopId}-${alarmData.line}-${Date.now()}`,
      createdAt: Date.now(),
      hasTriggered: false,
    };

    // Reemplazar alarma previa para la misma parada y línea si existía
    setAlarms((prev) => [
      newAlarm,
      ...prev.filter((a) => !(a.stopId === newAlarm.stopId && a.line === newAlarm.line)),
    ]);

    showToast(
      `Alarma programada para Línea ${alarmData.line} (cuando falten ≤ ${alarmData.triggerMinutes} min)`,
      'success'
    );

    // Evaluar de inmediato si el autobús ya está dentro del umbral
    const currentStop = stops.find((s) => s.stopId === alarmData.stopId);
    if (currentStop?.arrivals && currentStop.arrivals.length > 0) {
      checkAlarmsForStop(alarmData.stopId, currentStop.arrivals);
    }
  };

  const handleDeleteAlarm = (alarmId: string) => {
    if (ringingAlarm?.id === alarmId) {
      audioAlarm.stopAlarmRinging();
      setRingingAlarm(null);
    }
    setAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    showToast('Alarma eliminada', 'info');
  };

  const handleDismissRinging = () => {
    audioAlarm.stopAlarmRinging();
    if (ringingAlarm) {
      // Eliminar de las alarmas activas
      setAlarms((prev) => prev.filter((a) => a.id !== ringingAlarm.id));
    }
    setRingingAlarm(null);
  };

  // 9. Guardar credenciales de EMT MobilityLabs
  const handleSaveCredentials = async (creds: EMTAuthCredentials) => {
    await authenticateWithEMT(creds);
    const newStatus = await checkServerAuthStatus();
    setAuthStatus(newStatus);
    showToast('Credenciales EMT Madrid guardadas con éxito', 'success');

    if (stops.length > 0) {
      refreshAllStops();
    }
  };

  // 10. Desconectar credenciales
  const handleClearCredentials = () => {
    clearCredentials();
    setAuthStatus({
      configured: false,
      hasEnvCredentials: false,
      tokenActive: false,
    });
    showToast('Credenciales de EMT desconectadas', 'info');
  };

  // 11. Toggle de modo preview
  const handleTogglePreviewMode = (active: boolean) => {
    setPreviewModeActive(active);
    setIsPreviewMode(active);
    if (active) {
      showToast('Modo demostración activado con frecuencias oficiales de EMT', 'info');
    } else {
      showToast('Modo demostración desactivado', 'info');
    }
    if (stops.length > 0) {
      refreshAllStops();
    }
  };

  // Alarmas no disparadas
  const activeAlarmsList = alarms.filter((a) => !a.hasTriggered);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-[#005696] selection:text-white font-sans">
      {/* Barra superior / Header */}
      <Header
        authStatus={authStatus}
        isRefreshing={isRefreshing}
        autoRefreshEnabled={autoRefreshEnabled}
        countdown={countdown}
        onRefreshAll={refreshAllStops}
        onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        onOpenCredentials={() => setIsCredentialsModalOpen(true)}
        onOpenAddStop={() => {
          const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (inputEl) inputEl.focus();
        }}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        isPreviewMode={isPreviewMode}
        activeAlarmsCount={activeAlarmsList.length}
        onOpenAlarms={() => handleOpenAlarmModal(null)}
      />

      {/* Contenido principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner de alarmas activas si las hay */}
        {activeAlarmsList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <div>
                <span className="font-bold">
                  {activeAlarmsList.length === 1
                    ? '1 Alarma de autobús con sonido activa'
                    : `${activeAlarmsList.length} Alarmas de autobús activas`}
                </span>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  El sistema sonará automáticamente cuando tu autobús esté a los minutos configurados.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenAlarmModal(null)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors self-end sm:self-auto shrink-0 shadow-2xs"
            >
              Ver alarmas programadas
            </button>
          </div>
        )}

        {/* Banner informativo de datos en vivo de Madrid */}
        {!authStatus.configured && !isPreviewMode && stops.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-blue-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#005696] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  Conexión con Datos Abiertos de Madrid (dataset 900029-0)
                </span>
                <p className="text-blue-800 text-[11px] mt-0.5">
                  Para obtener los tiempos en vivo sin interrupciones, conecta tu clave gratuita de EMT MobilityLabs o activa la vista previa.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => handleTogglePreviewMode(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-[#005696] font-bold transition-colors"
              >
                Activar vista previa
              </button>
              <button
                onClick={() => setIsCredentialsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#005696] text-white font-bold hover:bg-[#004780] transition-colors"
              >
                Configurar credenciales
              </button>
            </div>
          </div>
        )}

        {/* Buscador de paradas para añadir */}
        <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#005696]" />
              <span>Añadir parada de la EMT</span>
            </h2>
            <span className="text-xs text-slate-400">
              {stops.length} {stops.length === 1 ? 'parada en seguimiento' : 'paradas en seguimiento'}
            </span>
          </div>
          <AddStopBar
            onAddStop={handleAddStop}
            existingStopIds={stops.map((s) => s.stopId)}
          />
        </section>

        {/* Listado de paradas añadidas o estado vacío inicial */}
        {stops.length === 0 ? (
          <EmptyState
            onSelectQuickStop={(stopId, name) => handleAddStop(stopId, name)}
            onOpenCredentials={() => setIsCredentialsModalOpen(true)}
            hasCredentials={authStatus.configured}
            isPreviewMode={isPreviewMode}
          />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Tus paradas en tiempo real
              </h2>
              <button
                onClick={() => setStops([])}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Limpiar todas las paradas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {stops.map((stop) => (
                <StopCard
                  key={stop.stopId}
                  stop={stop}
                  onRefresh={refreshSingleStop}
                  onDelete={handleDeleteStop}
                  onUpdateAlias={handleUpdateAlias}
                  onOpenMap={handleOpenMap}
                  activeAlarms={activeAlarmsList}
                  onSetAlarm={(targetStop, line, destination) =>
                    handleOpenAlarmModal(targetStop, line, destination)
                  }
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Pie de página con créditos oficiales */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto space-y-1.5">
          <p className="font-medium text-slate-700">
            Aplicación de Tiempos de Espera de Autobuses de la EMT de Madrid
          </p>
          <p className="text-[11px] text-slate-400">
            Fuente de datos oficiales:{' '}
            <a
              href="https://datos.madrid.es/dataset/900029-0-emt-autobus-tiempo-real"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#005696] hover:underline font-semibold"
            >
              Ayuntamiento de Madrid - Portal de Datos Abiertos (ID 900029-0-emt-autobus-tiempo-real)
            </a>{' '}
            • API REST MobilityLabs EMT Madrid
          </p>
        </div>
      </footer>

      {/* Modales de Configuración */}
      <CredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        onSaveCredentials={handleSaveCredentials}
        onClearCredentials={handleClearCredentials}
        authStatus={authStatus}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={handleTogglePreviewMode}
      />

      <StopMapModal
        isOpen={isMapModalOpen}
        onClose={() => {
          setIsMapModalOpen(false);
          setMapTargetStop(null);
          setMapTargetBus(undefined);
        }}
        stop={mapTargetStop}
        selectedBus={mapTargetBus}
      />

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onOpenCredentials={() => {
          setIsInfoModalOpen(false);
          setIsCredentialsModalOpen(true);
        }}
      />

      {/* Modal de Alarma con Sonido */}
      <AlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        targetStop={alarmTargetStop}
        targetLine={alarmTargetLine}
        targetDestination={alarmTargetDestination}
        allStops={stops}
        activeAlarms={activeAlarmsList}
        onAddAlarm={handleAddAlarm}
        onDeleteAlarm={handleDeleteAlarm}
      />

      {/* Modal / Diálogo de Alarma Sonando */}
      <AlarmRingingModal
        alarm={ringingAlarm}
        currentEstimatedMinutes={ringingEstimatedMinutes}
        onDismiss={handleDismissRinging}
      />

      {/* Notificación Toast flotante */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
