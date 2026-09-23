import React from 'react';
import { X, ExternalLink, Database, Info, Bus, CheckCircle2 } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCredentials: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  onOpenCredentials,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005696] text-white flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Datos Abiertos del Ayuntamiento de Madrid
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Especificación oficial del conjunto de datos
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

        {/* Contenido */}
        <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed max-h-[75vh] overflow-y-auto">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Bus className="w-4 h-4 text-[#005696]" />
              <span>Dataset 900029-0-emt-autobus-tiempo-real</span>
            </div>
            <p>
              Esta aplicación consume la información del servicio SAE (Sistema de Ayuda a la Explotación) de la Empresa Municipal de Transportes de Madrid (EMT), publicado a través del catálogo de datos abiertos municipal.
            </p>
            <div>
              <a
                href="https://datos.madrid.es/dataset/900029-0-emt-autobus-tiempo-real"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#005696] hover:underline"
              >
                <span>Ver conjunto de datos en datos.madrid.es</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">
              ¿Cómo funcionan los códigos de parada de la EMT?
            </h4>
            <p>
              Cada parada de autobús en la ciudad de Madrid tiene asignado un número único (del 1 al 5900 aprox.). Este número aparece impreso en la parte superior de la marquesina o en la placa de la parada.
            </p>
            <p>
              La aplicación comienza completamente en blanco para que puedas organizar únicamente las paradas que utilizas en tu día a día (tu casa, trabajo, centro de estudios, etc.).
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h4 className="font-bold text-slate-900 text-sm">
              Información proporcionada en tiempo real:
            </h4>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tiempo estimado de llegada del próximo autobús (minutos y segundos)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tiempo de llegada del segundo autobús en ruta</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Distancia en metros al punto de parada</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Identificador del vehículo físico (número de flota de la EMT)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Localización GPS en vivo y visualización en mapa</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pie */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenCredentials();
            }}
            className="text-xs font-bold text-[#005696] hover:underline"
          >
            Configurar credenciales EMT &rarr;
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
