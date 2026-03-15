import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle2, X, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { EnergyData } from '../types/energy';
import { parseCSVData, parseExcelData } from '../utils/dataProcessing';
import { format } from 'date-fns';

interface Props {
  onDataLoaded: (data: EnergyData[], name: string) => void;
  isDark: boolean;
  data: EnergyData[];
  fileName: string;
}

export function FileUploader({ onDataLoaded, isDark, data, fileName }: Props) {
  const [drag, setDrag]     = useState(false);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    setError(null);
    setLoad(true);
    const name = file.name.toLowerCase();
    try {
      let parsed: EnergyData[] = [];
      if (name.endsWith('.csv')) {
        parsed = parseCSVData(await file.text());
      } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
        parsed = await parseExcelData(await file.arrayBuffer());
      } else {
        throw new Error('Format non supporté (.csv, .xls, .xlsx uniquement)');
      }
      if (parsed.length === 0) throw new Error('Aucune donnée valide trouvée dans le fichier');
      onDataLoaded(parsed, file.name);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
    } finally {
      setLoad(false);
    }
  }, [onDataLoaded]);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    if (e.dataTransfer.files?.[0]) process(e.dataTransfer.files[0]);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) process(e.target.files[0]);
  };
  const clear = () => {
    onDataLoaded([], '');
    setError(null);
    if (ref.current) ref.current.value = '';
  };

  const loaded = data.length > 0;
  const dateLabel = loaded
    ? `Données chargées : ${data.length} jours du ${format(data[0].date, 'yyyy-MM-dd')} au ${format(data[data.length - 1].date, 'yyyy-MM-dd')}`
    : null;

  return (
    <div className="mb-8">
      <div
        onDragEnter={onDrag} onDragOver={onDrag} onDragLeave={onDrag} onDrop={onDrop}
        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
          drag   ? 'border-leaf-500 bg-leaf-500/5 scale-[1.01]' :
          loaded ? 'border-leaf-500/40 bg-leaf-500/5' :
                   `border-dashed ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-white/70'}`
        } backdrop-blur-sm`}
      >
        {/* Animated shimmer when loading */}
        {loading && <div className="absolute inset-0 shimmer z-10 pointer-events-none" />}

        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
          {/* Icon */}
          <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
            loaded ? 'bg-gradient-to-br from-leaf-400 to-leaf-600 shadow-leaf-500/30'
                   : isDark ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            {loaded
              ? <CheckCircle2 className="text-white animate-pulse-slow" size={32} />
              : <FileSpreadsheet className={isDark ? 'text-slate-500' : 'text-slate-400'} size={32} />
            }
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            {loaded ? (
              <>
                <p className="font-bold text-leaf-600 dark:text-leaf-400 text-base truncate">{fileName}</p>
                <p className={`text-sm mt-0.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {dateLabel}
                </p>
              </>
            ) : (
              <>
                <p className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  Uploader fichier EMA
                </p>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Formats acceptés : <span className="font-mono font-semibold">.xls · .xlsx · .csv</span>
                  <span className="ml-2 hidden sm:inline">— glissez-déposez ou cliquez</span>
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  Colonnes : Date, Produced, Consumed, Exported, Imported, Charged, Discharged
                </p>
              </>
            )}
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-red-500 text-sm font-medium">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex gap-3 flex-shrink-0">
            <input ref={ref} type="file" id="ema-upload" accept=".csv,.xls,.xlsx" onChange={onChange} className="hidden" />
            <label
              htmlFor="ema-upload"
              className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-200 select-none ${
                loading
                  ? 'opacity-60 cursor-not-allowed bg-slate-500 text-white'
                  : 'bg-gradient-to-r from-leaf-500 to-leaf-600 hover:from-leaf-600 hover:to-leaf-700 text-white shadow-leaf-500/30 hover:shadow-leaf-500/50 hover:scale-[1.03] active:scale-[0.97]'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              <span className="whitespace-nowrap">{loading ? 'Lecture…' : loaded ? 'Changer' : 'Choisir fichier'}</span>
            </label>
            {loaded && (
              <button onClick={clear} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 transition-all duration-200" title="Effacer">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
