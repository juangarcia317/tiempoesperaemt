import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { EMTAuthCredentials, EMTAuthStatus } from '../types/emt';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCredentials: (creds: EMTAuthCredentials) => Promise<void>;
  onClearCredentials: () => void;
  authStatus: EMTAuthStatus;
  isPreviewMode: boolean;
  onTogglePreviewMode: (enabled: boolean) => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  onSaveCredentials,
  onClearCredentials,
  authStatus,
  isPreviewMode,
  onTogglePreviewMode,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'client'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [passKey, setPassKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      if (activeTab === 'email') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Por favor introduce tu email y contraseña de MobilityLabs');
        }
        await onSaveCredentials({ email: email.trim(), password });
      } else {
        if (!clientId.trim() || !passKey.trim()) {
          throw new Error('Por favor introduce tu X-ClientId y PassKey');
        }
        await onSaveCredentials({ clientId: clientId.trim(), passKey: passKey.trim() });
      }

      setFeedback({
        type: 'success',
        message: '¡Conexión verificada! Tus credenciales de EMT Madrid están activas.',
      });

      // Si estaba en modo demo, apagarlo ya que ahora tiene datos reales
      if (isPreviewMode) {
        onTogglePreviewMode(false);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al autenticar con EMT MobilityLabs. Revisa tus datos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    onClearCredentials();
    setEmail('');
    setPassword('');
    setClientId('');
    setPassKey('');
    setFeedback({
      type: 'success',
      message: 'Credenciales eliminadas.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005696] text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Acceso Oficial EMT Madrid
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Portal de Datos Abiertos • Dataset ID: 900029-0
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

        {/* Cuerpo informativo */}
        <div className="p-6 space-y-5">
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#005696]" />
              <span>Autenticación de Datos Abiertos de Madrid</span>
            </div>
            Para acceder a los tiempos reales de los autobuses, el Ayuntamiento de Madrid requiere una clave gratuita de <strong>Mobility Labs Madrid</strong>.
            <div className="mt-2">
              <a
                href="https://mobilitylabs.emtmadrid.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#005696] hover:underline"
              >
                <span>Crear cuenta gratuita en MobilityLabs (1 minuto)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Estado actual de la conexión */}
          {authStatus.configured && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Conectado a la API oficial de EMT</span>
                  {authStatus.userEmail && (
                    <span className="block text-[11px] text-emerald-700">
                      Usuario: {authStatus.userEmail}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
              >
                Desconectar
              </button>
            </div>
          )}

          {/* Selector de pestañas */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setFeedback(null);
              }}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'email'
                  ? 'border-[#005696] text-[#005696]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Email y Contraseña (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('client');
                setFeedback(null);
              }}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'client'
                  ? 'border-[#005696] text-[#005696]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              X-ClientId & PassKey
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'email' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email de MobilityLabs
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005696] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña de MobilityLabs
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005696] transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    X-ClientId de la aplicación EMT
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Ej. e14f9c80-..."
                    required
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005696] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PassKey
                  </label>
                  <input
                    type="password"
                    value={passKey}
                    onChange={(e) => setPassKey(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005696] transition-all"
                  />
                </div>
              </>
            )}

            {/* Mensajes de feedback */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#005696] text-white text-sm font-bold hover:bg-[#004780] active:scale-98 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando con EMT Madrid...</span>
                </>
              ) : (
                <span>Guardar y Conectar API</span>
              )}
            </button>
          </form>

          {/* Alternativa de vista previa para probar sin registrarse todavía */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Modo Demostración / Vista Previa</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Muestra estimaciones simuladas según frecuencias oficiales de la EMT mientras creas tu cuenta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTogglePreviewMode(!isPreviewMode)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                isPreviewMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isPreviewMode ? 'Activo' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
