import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { MonthlyProjection, SeasonalStats } from '../types/energy';
import { TrendingUp, Euro, Calendar } from 'lucide-react';

interface Props {
  monthlyProjections: MonthlyProjection[];
  seasonalStats: SeasonalStats[];
  isDark: boolean;
  electricityPrice: number;
}

export function ProjectionsSection({ monthlyProjections, seasonalStats, isDark, electricityPrice }: Props) {
  const monthlyRef = useRef<HTMLDivElement>(null);
  const seasonRef  = useRef<HTMLDivElement>(null);

  const totalProd   = monthlyProjections.reduce((s, m) => s + m.production,  0);
  const totalSavings= monthlyProjections.reduce((s, m) => s + m.savings, 0);
  const bestMonth   = monthlyProjections.length ? monthlyProjections.reduce((a, b) => b.production > a.production ? b : a) : null;

  const bg   = isDark ? '#0d1520' : '#ffffff';
  const text = isDark ? '#94a3b8'  : '#475569';
  const grid = isDark ? '#1e293b'  : '#f1f5f9';

  useEffect(() => {
    if (!monthlyRef.current || monthlyProjections.length === 0) return;
    const seasonColors = monthlyProjections.map(m => {
      if ([2,3,4].includes(m.monthIndex))  return '#22c55e';
      if ([5,6,7].includes(m.monthIndex))  return '#f59e0b';
      if ([8,9,10].includes(m.monthIndex)) return '#f97316';
      return '#38bdf8';
    });

    Plotly.react(monthlyRef.current, [
      {
        x: monthlyProjections.map(m => m.month),
        y: monthlyProjections.map(m => m.production),
        type: 'bar', name: 'Production (kWh)',
        marker: { color: seasonColors, opacity: 0.85, line: { color: 'transparent' } },
        yaxis: 'y',
      },
      {
        x: monthlyProjections.map(m => m.month),
        y: monthlyProjections.map(m => m.savings),
        type: 'scatter', mode: 'lines+markers', name: 'Économies (€)',
        line: { color: '#a78bfa', width: 3 },
        marker: { size: 9, color: '#a78bfa', symbol: 'circle' },
        yaxis: 'y2',
      },
    ], {
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text, zeroline: false },
      yaxis:  { gridcolor: grid, color: text, title: 'kWh', zeroline: false },
      yaxis2: { overlaying: 'y', side: 'right', color: '#a78bfa', title: '€', showgrid: false, zeroline: false },
      legend: { orientation: 'h', x: 0, y: 1.10, font: { size: 12 } },
      margin: { l: 55, r: 55, t: 20, b: 45 },
      hovermode: 'x unified', bargap: 0.28, autosize: true,
    }, { responsive: true, displayModeBar: false });
  }, [monthlyProjections, isDark]);

  useEffect(() => {
    if (!seasonRef.current || !seasonalStats.some(s => s.days > 0)) return;
    const activeSeas = seasonalStats.filter(s => s.days > 0);

    Plotly.react(seasonRef.current, activeSeas.flatMap(s => [
      { x: [s.label], y: [s.avgDailyProduction], type: 'bar' as const, name: `${s.emoji} Prod/j (kWh)`,
        marker: { color: s.color }, legendgroup: s.season, showlegend: true },
    ]), {
      barmode: 'group',
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text },
      yaxis: { gridcolor: grid, color: text, title: 'kWh/jour', zeroline: false },
      legend: { orientation: 'h', x: 0, y: 1.12, font: { size: 11 } },
      margin: { l: 50, r: 16, t: 20, b: 45 },
      autosize: true,
    }, { responsive: true, displayModeBar: false });
  }, [seasonalStats, isDark]);

  const card = isDark ? 'bg-[#0d1520] border-slate-800' : 'bg-white border-slate-100';

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: TrendingUp, grad: 'from-leaf-500 to-leaf-600',
            label: 'Production annuelle projetée',
            val: `${totalProd.toFixed(0)} kWh`,
            sub: `≈ ${(totalProd / 12).toFixed(0)} kWh / mois`,
          },
          {
            icon: Euro, grad: 'from-solar-500 to-solar-600',
            label: 'Économies annuelles projetées',
            val: `${totalSavings.toFixed(0)} €`,
            sub: `à ${electricityPrice.toFixed(2)} €/kWh · ≈ ${(totalSavings / 12).toFixed(0)} €/mois`,
          },
          {
            icon: Calendar, grad: 'from-sky-500 to-sky-600',
            label: 'Meilleur mois prévu',
            val: bestMonth ? `${bestMonth.month} — ${bestMonth.production.toFixed(0)} kWh` : '—',
            sub: bestMonth ? `Économies : ${bestMonth.savings.toFixed(0)} €` : '',
          },
        ].map(({ icon: Icon, grad, label, val, sub }) => (
          <div key={label} className={`${card} border rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${grad} shadow`}>
                <Icon className="text-white" size={16} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
            </div>
            <div className={`text-2xl font-extrabold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>{val}</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {monthlyProjections.length > 0 && (
        <div className="card p-5">
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            📅 Projections 12 mois — Production & Économies
          </h3>
          <div ref={monthlyRef} style={{ width: '100%', height: 320 }} />
        </div>
      )}

      {/* Seasonal cards + chart */}
      {seasonalStats.some(s => s.days > 0) && (
        <div className="card p-5">
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            🌡️ Comparaison saisonnière détaillée
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {seasonalStats.map(s => (
              <div key={s.season}
                className={`rounded-xl p-4 border-l-4 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                style={{ borderLeftColor: s.color }}
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <span style={{ color: s.color }} className="text-lg">{s.emoji}</span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.label}</span>
                  {s.days > 0 && <span className={`text-xs ml-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{s.days}j</span>}
                </div>
                {s.days > 0 ? (
                  <div className="space-y-2">
                    <div>
                      <div className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Prod. totale</div>
                      <div className="text-lg font-extrabold font-display" style={{ color: s.color }}>
                        {s.totalProduction.toFixed(0)} kWh
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 text-xs">
                      {[
                        ['Moy/jour', `${s.avgDailyProduction.toFixed(1)} kWh`],
                        ['Économies', `${s.savings.toFixed(0)} €`],
                        ['Autoconso.', `${s.avgAutoconsumption.toFixed(0)}%`],
                        ['Autosuff.', `${s.avgSelfSufficiency.toFixed(0)}%`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className={isDark ? 'text-slate-600' : 'text-slate-400'}>{k}</div>
                          <div className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`h-1 rounded-full mt-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.avgDailyProduction / 55) * 100)}%`, background: s.color }} />
                    </div>
                  </div>
                ) : (
                  <div className={`text-sm ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Pas de données</div>
                )}
              </div>
            ))}
          </div>
          <div ref={seasonRef} style={{ width: '100%', height: 260 }} />
        </div>
      )}
    </div>
  );
}
