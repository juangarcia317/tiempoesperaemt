import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, MapPin, Bus, AlertCircle } from 'lucide-react';
import { searchCatalog, findStopInCatalog } from '../data/madridStops';
import { MadridStopCatalogItem } from '../types/emt';

interface AddStopBarProps {
  onAddStop: (stopId: string, customName?: string) => Promise<boolean>;
  existingStopIds: string[];
}

export const AddStopBar: React.FC<AddStopBarProps> = ({
  onAddStop,
  existingStopIds,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<MadridStopCatalogItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar sugerencias al teclear
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length >= 1) {
      const results = searchCatalog(trimmed);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    setErrorMsg(null);
  }, [inputValue]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = inputValue.trim();

    if (!cleanId) {
      setErrorMsg('Introduce un código de parada');
      return;
    }

    // Comprobar si es un número válido (código de parada de EMT)
    if (!/^\d+$/.test(cleanId)) {
      // Si el usuario escribió un texto, intentamos ver si coincide con alguna parada del catálogo
      const matched = suggestions[0];
      if (matched) {
        await handleSelectSuggestion(matched);
        return;
      }
      setErrorMsg('El código de parada debe ser numérico (ej: 72, 80, 270, 1988)');
      return;
    }

    if (existingStopIds.includes(cleanId)) {
      setErrorMsg(`La parada ${cleanId} ya está añadida en tu panel`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const catalogItem = findStopInCatalog(cleanId);
      const ok = await onAddStop(cleanId, catalogItem?.name);
      if (ok) {
        setInputValue('');
        setIsOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al añadir parada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSuggestion = async (item: MadridStopCatalogItem) => {
    if (existingStopIds.includes(item.stopId)) {
      setErrorMsg(`La parada ${item.stopId} (${item.name}) ya está en tu lista`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const ok = await onAddStop(item.stopId, item.name);
      if (ok) {
        setInputValue('');
        setIsOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder="Introduce código de parada EMT (ej. 72, 80, 270) o busca por calle..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005696] focus:border-transparent transition-all shadow-xs"
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !inputValue.trim()}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#005696] text-white text-sm font-semibold hover:bg-[#004780] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{isSubmitting ? 'Añadiendo...' : 'Añadir parada'}</span>
        </button>
      </form>

      {/* Mensaje de error de validación */}
      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Dropdown de autocompletado y catálogo */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in-50 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sugerencias de paradas EMT Madrid
          </div>
          {suggestions.map((item) => {
            const isAdded = existingStopIds.includes(item.stopId);
            return (
              <button
                key={item.stopId}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                disabled={isAdded}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                  isAdded
                    ? 'opacity-50 bg-slate-50 cursor-not-allowed'
                    : 'hover:bg-blue-50/60 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#005696]/10 text-[#005696] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {item.stopId}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 leading-tight">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                      {item.zone && (
                        <span className="text-slate-400">• {item.zone}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                    {item.lines.slice(0, 3).map((l) => (
                      <span
                        key={l}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold"
                      >
                        {l}
                      </span>
                    ))}
                    {item.lines.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{item.lines.length - 3}
                      </span>
                    )}
                  </div>
                  {isAdded && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-2">
                      Ya añadida
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
