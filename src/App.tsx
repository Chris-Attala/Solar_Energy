import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Zap, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { EnergyData } from './types/energy';
import { saveDataToCloud, loadDataFromCloud, isCloudEnabled } from './utils/storage';

export default function App() {
  const [isDark, setIsDark]          = useState(true);
  const [data, setData]              = useState<EnergyData[]>([]);
  const [fileName, setFileName]      = useState('');
  const [electricityPrice, setPrice] = useState(0.28);
  const [cloudStatus, setCloudStatus]= useState<'idle'|'saving'|'saved'|'loading'|'error'>('idle');
  const [cloudEnabled]               = useState(isCloudEnabled);

  // Theme + price persistence (localStorage, local only)
  useEffect(() => {
    const t = localStorage.getItem('ema-theme');
    setIsDark(t !== 'light');
    const p = localStorage.getItem('ema-price');
    if (p) setPrice(parseFloat(p));
  }, []);

  useEffect(() => {
    localStorage.setItem('ema-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('ema-price', String(electricityPrice));
  }, [electricityPrice]);

  // Auto-load from cloud on first visit
  useEffect(() => {
    if (!cloudEnabled) return;
    setCloudStatus('loading');
    loadDataFromCloud().then(result => {
      if (result && result.data.length > 0) {
        setData(result.data);
        setFileName(result.fileName);
        setCloudStatus('saved');
      } else {
        setCloudStatus('idle');
      }
    }).catch(() => setCloudStatus('error'));
  }, [cloudEnabled]);

  const handleDataLoaded = useCallback(async (d: EnergyData[], name: string) => {
    setData(d);
    setFileName(name);
    if (d.length > 0 && cloudEnabled) {
      setCloudStatus('saving');
      const ok = await saveDataToCloud(d, name);
      setCloudStatus(ok ? 'saved' : 'error');
    }
  }, [cloudEnabled]);

  const cloudBadge = () => {
    if (!cloudEnabled) return (
      <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`} title="Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel pour activer la persistance cloud">
        <CloudOff size={12} /> Local only
      </div>
    );
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      idle:    { icon: <Cloud size={12} />,                                   label: 'Cloud prêt',   cls: isDark ? 'border-slate-800 text-slate-500'     : 'border-slate-200 text-slate-400' },
      loading: { icon: <Loader2 size={12} className="animate-spin" />,        label: 'Chargement…',  cls: isDark ? 'border-sky-800 text-sky-400'          : 'border-sky-200 text-sky-600' },
      saving:  { icon: <Loader2 size={12} className="animate-spin" />,        label: 'Sauvegarde…',  cls: isDark ? 'border-solar-800 text-solar-400'      : 'border-solar-200 text-solar-600' },
      saved:   { icon: <Cloud size={12} />,                                   label: '☁ Synchronisé',cls: isDark ? 'border-leaf-800/50 text-leaf-400'     : 'border-leaf-200 text-leaf-600' },
      error:   { icon: <CloudOff size={12} />,                                label: 'Erreur cloud', cls: isDark ? 'border-rose-900/50 text-rose-500'     : 'border-rose-200 text-rose-600' },
    };
    const s = map[cloudStatus];
    return (
      <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${s.cls}`}>
        {s.icon} {s.label}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#070c14]' : 'bg-gradient-to-br from-slate-50 via-emerald-50/40 to-amber-50/30'
    }`}>

      {/* ── Navbar ── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        isDark ? 'bg-[#070c14]/90 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
      } shadow-sm`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0 mr-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-leaf-400 via-solar-400 to-sky-500 shadow-lg shadow-leaf-500/30 flex items-center justify-center animate-float">
              <Sun className="text-white" size={20} />
            </div>
            <div>
              <div className={`font-display font-extrabold text-lg leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                EMA Solar
              </div>
              <div className={`text-[10px] font-medium leading-none mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Mandelieu · 12 kWc · SSO 210°
              </div>
            </div>
          </div>

          {/* Cloud status */}
          {cloudBadge()}

          {/* Price control */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50 border-amber-200'
          }`}>
            <Zap size={14} className={isDark ? 'text-solar-400' : 'text-solar-600'} />
            <span className={`text-xs font-semibold hidden md:block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Prix kWh</span>
            <input
              type="number" min="0.05" max="1.00" step="0.01"
              value={electricityPrice}
              onChange={e => setPrice(Math.max(0.05, Math.min(1, parseFloat(e.target.value) || 0.28)))}
              className={`w-16 text-sm font-bold text-center rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-solar-400/50 ${
                isDark ? 'bg-slate-800 text-solar-300 border border-slate-700' : 'bg-white text-solar-700 border border-amber-200'
              }`}
            />
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>€</span>
            <input
              type="range" min="0.10" max="0.60" step="0.01"
              value={electricityPrice}
              onChange={e => setPrice(parseFloat(e.target.value))}
              className="w-20 accent-solar-500 cursor-pointer hidden lg:block"
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(d => !d)}
            className={`p-2.5 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-yellow-400'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
            }`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Cloud loading spinner (first visit) */}
        {cloudStatus === 'loading' && data.length === 0 && (
          <div className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border ${
            isDark ? 'bg-sky-900/20 border-sky-800/40 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}>
            <Loader2 size={18} className="animate-spin flex-shrink-0" />
            <span className="text-sm font-medium">Récupération de vos dernières données depuis le cloud…</span>
          </div>
        )}

        <FileUploader
          onDataLoaded={handleDataLoaded}
          isDark={isDark}
          data={data}
          fileName={fileName}
        />

        {data.length > 0 ? (
          <Dashboard data={data} isDark={isDark} electricityPrice={electricityPrice} />
        ) : cloudStatus !== 'loading' ? (
          <div className="flex flex-col items-center justify-center py-28 gap-6">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full ${isDark ? 'bg-slate-900' : 'bg-white'} border ${isDark ? 'border-slate-800' : 'border-slate-100'} shadow-2xl flex items-center justify-center`}>
                <Sun className={`${isDark ? 'text-solar-400' : 'text-solar-500'} animate-pulse-slow`} size={52} />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-leaf-400 to-leaf-600 flex items-center justify-center shadow-lg">
                <Zap className="text-white" size={14} />
              </div>
            </div>
            <div className="text-center max-w-sm">
              <h2 className={`text-2xl font-display font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Votre dashboard solaire vous attend
              </h2>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Importez votre export EMA/APsystems — les données seront{' '}
                {cloudEnabled
                  ? <span className="text-leaf-500 font-semibold">automatiquement synchronisées sur tous vos appareils</span>
                  : 'chargées dans le dashboard'
                }.
              </p>
              <div className={`flex flex-wrap justify-center gap-2 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                {['.xls', '.xlsx', '.csv'].map(f => (
                  <span key={f} className={`px-3 py-1.5 rounded-lg font-mono font-semibold border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>{f}</span>
                ))}
              </div>
              {!cloudEnabled && (
                <p className={`mt-4 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  💡 Pour activer la sync cross-device : voir README.md
                </p>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <footer className={`border-t mt-16 py-6 text-center text-xs ${isDark ? 'border-slate-800 text-slate-700' : 'border-slate-200 text-slate-400'}`}>
        EMA Solar Dashboard · Mandelieu-la-Napoule 06210 · 12 kWc · Données météo : Open-Meteo API
      </footer>
    </div>
  );
}
