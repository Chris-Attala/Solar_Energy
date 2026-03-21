import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { EnergyData } from './types/energy';
import { saveDataToCloud, loadDataFromCloud, isCloudEnabled } from './utils/storage';
import { ThemeProvider } from './context/ThemeContext';

const DEFAULT_PRICE = 0.1813;

export default function App() {
  const [data, setData] = useState<EnergyData[]>([]);
  const [fileName, setFileName] = useState('');
  const [electricityPrice, setElectricityPrice] = useState(DEFAULT_PRICE);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'saving' | 'saved' | 'loading' | 'error'>('idle');
  const cloudEnabled = isCloudEnabled();
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('ema-theme') !== 'light';
  });

  useEffect(() => {
    localStorage.setItem('ema-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

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
          className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border text-theme-secondary"
          style={{ borderColor: 'var(--border)' }}
          title="VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY pour activer la sync"
        >
          <CloudOff size={12} /> Local
        </div>
      );
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      idle: { icon: <Cloud size={12} />, label: 'Cloud prêt', cls: 'text-theme-secondary' },
      loading: { icon: <Loader2 size={12} className="animate-spin" />, label: 'Chargement…', cls: 'text-sky-600' },
      saving: { icon: <Loader2 size={12} className="animate-spin" />, label: 'Sauvegarde…', cls: 'text-amber-600' },
      saved: { icon: <Cloud size={12} />, label: '☁ Synchronisé', cls: 'text-[#22c55e]' },
      error: { icon: <CloudOff size={12} />, label: 'Erreur', cls: 'text-rose-500' },
    };
    const s = map[cloudStatus];
    return (
      <div
        className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${s.cls}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {s.icon} {s.label}
      </div>
    );
  }

  return (
    <ThemeProvider isDark={isDark}>
      <div className="app-shell">
        <header className="app-header sticky top-0 z-50">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 flex-wrap py-2">
            <div className="flex items-center gap-3 flex-shrink-0 mr-auto">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
                <Sun className="text-white" size={20} />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-theme">SolaCris</div>
                <div className="text-[10px] text-theme-muted">Mandelieu-la-Napoule 06210</div>
              </div>
            </div>

            {cloudBadge()}

            <div className="surface-muted flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-theme-muted whitespace-nowrap">€/kWh</span>
              <input
                type="number"
                min="0.05"
                max="1"
                step="0.0001"
                value={electricityPrice}
                onChange={(e) =>
                  setElectricityPrice(Math.max(0.05, Math.min(1, parseFloat(e.target.value) || DEFAULT_PRICE)))
                }
                className="w-16 text-sm font-semibold text-center rounded bg-transparent text-[#22c55e] border-0 focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                title="Prix de l'électricité €/kWh"
              />
            </div>

            <button
              onClick={() => setIsDark((d) => !d)}
              className="surface-muted p-2 rounded-lg text-theme-secondary hover:text-[#22c55e] transition-colors"
              title={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
          {cloudStatus === 'loading' && data.length === 0 && (
            <div
              className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border text-theme-secondary text-sm surface-muted"
              style={{ borderColor: 'var(--border)' }}
            >
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
              <div className="card w-20 h-20 flex items-center justify-center">
                <Sun className="text-[#22c55e]" size={40} />
              </div>
              <p className="text-theme-secondary text-sm max-w-sm">
                Uploadez votre export EMA (.xls / .xlsx / .csv) pour afficher le dashboard.
              </p>
            </div>
          ) : null}
        </main>

        <footer
          className="border-t mt-12 py-4 text-center text-xs text-theme-muted"
          style={{ borderColor: 'var(--border)' }}
        >
          EMA Solar · Mandelieu-la-Napoule · Données météo Open-Meteo
        </footer>
      </div>
    </ThemeProvider>
  );
}
