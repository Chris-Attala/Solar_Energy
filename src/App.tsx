import { useState, useEffect, useCallback } from 'react';
import { Sun, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { EnergyData } from './types/energy';
import { saveDataToCloud, loadDataFromCloud, isCloudEnabled } from './utils/storage';

const DEFAULT_PRICE = 0.1813;

export default function App() {
  const [data, setData] = useState<EnergyData[]>([]);
  const [fileName, setFileName] = useState('');
  const [electricityPrice, setElectricityPrice] = useState(DEFAULT_PRICE);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'saving' | 'saved' | 'loading' | 'error'>('idle');
  const cloudEnabled = isCloudEnabled();

  useEffect(() => {
    const p = localStorage.getItem('ema-price');
    if (p != null) setElectricityPrice(parseFloat(p));
  }, []);

  useEffect(() => {
    localStorage.setItem('ema-price', String(electricityPrice));
  }, [electricityPrice]);

  useEffect(() => {
    if (!cloudEnabled) return;
    setCloudStatus('loading');
    loadDataFromCloud()
      .then((result) => {
        if (result && result.data.length > 0) {
          setData(result.data);
          setFileName(result.fileName);
          setCloudStatus('saved');
        } else {
          setCloudStatus('idle');
        }
      })
      .catch(() => setCloudStatus('error'));
  }, [cloudEnabled]);

  const handleDataLoaded = useCallback(
    async (d: EnergyData[], name: string) => {
      setData(d);
      setFileName(name);
      if (d.length > 0 && cloudEnabled) {
        setCloudStatus('saving');
        const ok = await saveDataToCloud(d, name);
        setCloudStatus(ok ? 'saved' : 'error');
      }
    },
    [cloudEnabled]
  );

  function cloudBadge() {
    if (!cloudEnabled)
      return (
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-500"
          title="VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY pour activer la sync"
        >
          <CloudOff size={12} /> Local
        </div>
      );
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      idle:    { icon: <Cloud size={12} />,                                label: 'Cloud prêt',    cls: 'border-slate-800 text-slate-500' },
      loading: { icon: <Loader2 size={12} className="animate-spin" />,    label: 'Chargement…',   cls: 'border-sky-700 text-sky-400' },
      saving:  { icon: <Loader2 size={12} className="animate-spin" />,    label: 'Sauvegarde…',   cls: 'border-amber-700 text-amber-400' },
      saved:   { icon: <Cloud size={12} />,                               label: '☁ Synchronisé', cls: 'border-[#22c55e]/40 text-[#22c55e]' },
      error:   { icon: <CloudOff size={12} />,                            label: 'Erreur',         cls: 'border-rose-800 text-rose-400' },
    };
    const s = map[cloudStatus];
    return (
      <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${s.cls}`}>
        {s.icon} {s.label}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070c14]">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070c14]/95 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 flex-wrap py-2">
          <div className="flex items-center gap-3 flex-shrink-0 mr-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
              <Sun className="text-white" size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-white">SolaCris</div>
              <div className="text-[10px] text-slate-500">Mandelieu-la-Napoule 06210</div>
            </div>
          </div>

          {cloudBadge()}

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0d1520]">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">€/kWh</span>
            <input
              type="number"
              min="0.05"
              max="1"
              step="0.0001"
              value={electricityPrice}
              onChange={(e) =>
                setElectricityPrice(Math.max(0.05, Math.min(1, parseFloat(e.target.value) || DEFAULT_PRICE)))
              }
              className="w-16 text-sm font-semibold text-center rounded bg-slate-800 text-[#22c55e] border-0 focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
              title="Prix de l'électricité €/kWh"
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        {cloudStatus === 'loading' && data.length === 0 && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin flex-shrink-0" />
            Récupération des données cloud…
          </div>
        )}

        <FileUploader
          onDataLoaded={handleDataLoaded}
          data={data}
          fileName={fileName}
          cloudSynced={cloudEnabled && cloudStatus === 'saved'}
        />

        {data.length > 0 ? (
          <Dashboard data={data} electricityPrice={electricityPrice} />
        ) : cloudStatus !== 'loading' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#0d1520] border border-slate-800 flex items-center justify-center">
              <Sun className="text-[#22c55e]" size={40} />
            </div>
            <p className="text-slate-400 text-sm max-w-sm">
              Uploadez votre export EMA (.xls / .xlsx / .csv) pour afficher le dashboard.
            </p>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-slate-800 mt-12 py-4 text-center text-xs text-slate-600">
        EMA Solar · Mandelieu-la-Napoule · Données météo Open-Meteo
      </footer>
    </div>
  );
}
