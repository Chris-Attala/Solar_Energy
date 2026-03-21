import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { EnergyData } from '../types/energy';
import { parseCSVData, parseExcelData } from '../utils/dataProcessing';
import { format } from 'date-fns';

interface Props {
  onDataLoaded: (data: EnergyData[], name: string) => void;
  data: EnergyData[];
  fileName: string;
  cloudSynced: boolean;
}

export function FileUploader({ onDataLoaded, data, fileName, cloudSynced }: Props) {
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const process = useCallback(
    async (file: File) => {
      setError(null);
      setLoad(true);
      const name = file.name.toLowerCase();
      try {
        let parsed: EnergyData[] = [];
        if (name.endsWith('.csv')) {
          parsed = parseCSVData(await file.text());
        } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
          parsed = parseExcelData(await file.arrayBuffer());
        } else {
          throw new Error('Format non supporté (.csv, .xls, .xlsx)');
        }
        if (parsed.length === 0) throw new Error('Aucune donnée valide');
        onDataLoaded(parsed, file.name);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        setLoad(false);
      }
    },
    [onDataLoaded]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) process(e.dataTransfer.files[0]);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) process(e.target.files[0]);
  };

  const loaded = data.length > 0;
  const message = loaded
    ? `${data.length} jours chargés · du ${format(data[0].date, 'yyyy-MM-dd')} au ${format(data[data.length - 1].date, 'yyyy-MM-dd')}${cloudSynced ? ' · ☁ Synchronisé' : ''}`
    : null;

  return (
    <div className="mb-8">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`rounded-2xl border-2 border-dashed transition-colors ${
          loaded ? 'border-[#22c55e]/50 bg-[#22c55e]/5' : 'hover:opacity-90'
        }`}
        style={
          loaded
            ? undefined
            : {
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-card)',
              }
        }
      >
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <input
            ref={ref}
            type="file"
            id="ema-upload"
            accept=".csv,.xls,.xlsx"
            onChange={onChange}
            className="hidden"
          />
          <label
            htmlFor="ema-upload"
            className={`flex-shrink-0 inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base cursor-pointer transition-all select-none ${
              loading
                ? 'opacity-60 cursor-not-allowed bg-slate-600 text-slate-300'
                : 'bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-lg shadow-[#22c55e]/20'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Upload size={22} />
            )}
            <span>{loading ? 'Lecture…' : loaded ? 'Changer le fichier' : 'Uploader un fichier EMA'}</span>
          </label>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {loaded && message && (
              <p className="text-theme text-sm font-medium">
                {message}
              </p>
            )}
            {!loaded && (
              <p className="text-theme-secondary text-sm">
                .xls · .xlsx · .csv — Colonnes : Date, Produced, Consumed, Exported, Imported, Charged, Discharged
              </p>
            )}
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
