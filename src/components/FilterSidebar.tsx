import { Calendar, Filter, BarChart3 } from 'lucide-react';
import { Granularity, Season } from '../types/energy';

interface Props {
  startDate: string; endDate: string;
  season: Season; granularity: Granularity;
  onStartDate: (v: string) => void; onEndDate: (v: string) => void;
  onSeason: (v: Season) => void; onGranularity: (v: Granularity) => void;
  isDark: boolean;
}

export function FilterSidebar({ startDate, endDate, season, granularity, onStartDate, onEndDate, onSeason, onGranularity, isDark }: Props) {
  const seasons: { value: Season; label: string; emoji: string }[] = [
    { value: 'all',    label: 'Toutes saisons', emoji: '🌍' },
    { value: 'spring', label: 'Printemps',       emoji: '🌸' },
    { value: 'summer', label: 'Été',             emoji: '☀️' },
    { value: 'autumn', label: 'Automne',         emoji: '🍂' },
    { value: 'winter', label: 'Hiver',           emoji: '❄️' },
  ];
  const grains: { value: Granularity; label: string }[] = [
    { value: 'daily',   label: 'Jour' },
    { value: 'weekly',  label: 'Semaine' },
    { value: 'monthly', label: 'Mois' },
  ];

  return (
    <div className={`rounded-2xl border p-5 space-y-6 sticky top-24 ${isDark ? 'bg-[#0d1520] border-slate-800' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600">
          <Filter className="text-white" size={14} />
        </div>
        <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Filtres</span>
      </div>

      {/* Date range */}
      <div>
        <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Calendar size={12} /> Plage dates
        </label>
        <div className="space-y-2">
          <input type="date" value={startDate} onChange={e => onStartDate(e.target.value)} className="input-field text-sm" />
          <input type="date" value={endDate}   onChange={e => onEndDate(e.target.value)}   className="input-field text-sm" />
        </div>
      </div>

      {/* Season */}
      <div>
        <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          🌡 Saison
        </label>
        <div className="space-y-1.5">
          {seasons.map(s => (
            <button key={s.value} onClick={() => onSeason(s.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                season === s.value
                  ? 'bg-gradient-to-r from-leaf-500 to-leaf-600 text-white shadow-md shadow-leaf-500/20'
                  : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Granularity */}
      <div>
        <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <BarChart3 size={12} /> Granularité
        </label>
        <div className="flex gap-1.5">
          {grains.map(g => (
            <button key={g.value} onClick={() => onGranularity(g.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                granularity === g.value
                  ? 'bg-gradient-to-r from-solar-500 to-solar-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 bg-slate-800/50 hover:bg-slate-800' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
