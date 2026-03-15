import { useState, useEffect, useCallback } from 'react';
import { Sun, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { EnergyData } from './types/energy';
import { saveDataToCloud, loadDataFromCloud, isCloudEnabled } from './utils/storage';

const DEFAULT_HC = 0.194;
const DEFAULT_HP = 0.25;
const DEFAULT_PCT_HC = 70;

function effectivePrice(hc: number, hp: number, pctHC: number): number {
  return (pctHC / 100) * hc + (1 - pctHC / 100) * hp;
}

export default function App() {
  const [data, setData] = useState<EnergyData[]>([]);
  const [fileName, setFileName] = useState('');
  const [priceHC, setPriceHC] = useState(DEFAULT_HC);
  const [priceHP, setPriceHP] = useState(DEFAULT_HP);
  const [pctHC, setPctHC] = useState(DEFAULT_PCT_HC);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'saving' | 'saved' | 'loading' | 'error'>('idle');
  const cloudEnabled = isCloudEnabled();

  const electricityPrice = effectivePrice(priceHC, priceHP, pctHC);

  useEffect(() => {
    const hc = localStorage.getItem('ema-priceHC');
    const hp = localStorage.getItem('ema-priceHP');
    const pct = localStorage.getItem('ema-pctHC');
    if (hc != null) setPriceHC(parseFloat(hc));
    if (hp != null) setPriceHP(parseFloat(hp));
    if (pct != null) setPctHC(Math.max(0, Math.min(100, parseInt(pct, 10))));
  }, []);

  useEffect(() => {
    localStorage.setItem('ema-priceHC', String(priceHC));
    localStorage.setItem('ema-priceHP', String(priceHP));
    localStorage.setItem('ema-pctHC', String(pctHC));
  }, [priceHC, priceHP, pctHC]);

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
      idle: { icon: <Cloud size={12} />, label: 'Cloud prêt', cls: 'border-slate-800 text-slate-500' },
      loading: {
        icon: <Loader2 size={12} className="animate-spin" />,
        label: 'Chargement…',
        cls: 'border-sky-700 text-sky-400',
      },
      saving: {
        icon: <Loader2 size={12} className="animate-spin" />,
        label: 'Sauvegarde…',
        cls: 'border-amber-700 text-amber-400',
      },
      saved: { icon: <Cloud size={12} />, label: '☁ Synchronisé', cls: 'border-[#22c55e]/40 text-[#22c55e]' },
      error: { icon: <CloudOff size={12} />, label: 'Erreur', cls: 'border-rose-800 text-rose-400' },
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
              <div className="font-display font-bold text-lg text-white">EMA Solar</div>
              <div className="text-[10px] text-slate-500">Mandelieu-la-Napoule 06210</div>
            </div>
          </div>
          {cloudBadge()}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0d1520]">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">HC</span>
              <input
                type="number"
                min="0.05"
                max="1"
                step="0.001"
                value={priceHC}
                onChange={(e) => setPriceHC(Math.max(0.05, Math.min(1, parseFloat(e.target.value) || DEFAULT_HC)))}
                className="w-14 text-sm font-semibold text-center rounded bg-slate-800 text-[#22c55e] border-0 focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                title="Heure creuse €/kWh TTC"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0d1520]">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">HP</span>
              <input
                type="number"
                min="0.05"
                max="1"
                step="0.001"
                value={priceHP}
                onChange={(e) => setPriceHP(Math.max(0.05, Math.min(1, parseFloat(e.target.value) || DEFAULT_HP)))}
                className="w-14 text-sm font-semibold text-center rounded bg-slate-800 text-[#f59e0b] border-0 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                title="Heure pleine €/kWh TTC"
              />
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-700 bg-[#0d1520]">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">Répart. HC %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={pctHC}
                onChange={(e) => setPctHC(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || DEFAULT_PCT_HC)))}
                className="w-10 text-xs font-medium text-center rounded bg-slate-800 text-slate-300 border-0 focus:outline-none focus:ring-1 focus:ring-slate-500"
                title="Part de l’import en heure creuse (pour le coût)"
              />
            </div>
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
