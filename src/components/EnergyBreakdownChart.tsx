import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { KPIData } from '../types/energy';

interface Props { kpiData: KPIData; isDark: boolean; }

export function EnergyBreakdownChart({ kpiData, isDark }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bg   = isDark ? '#0d1520' : '#ffffff';
    const text = isDark ? '#94a3b8'  : '#475569';
    const selfConsumed = Math.max(0, kpiData.totalProduced - kpiData.totalExported);

    Plotly.react(ref.current, [{
      values: [selfConsumed, kpiData.totalExported, kpiData.totalImported],
      labels: ['Autoconsommée', 'Exportée au réseau', 'Importée du réseau'],
      type: 'pie',
      hole: 0.55,
      marker: { colors: ['#22c55e', '#f59e0b', '#f43f5e'], line: { color: bg, width: 3 } },
      textinfo: 'percent',
      textposition: 'inside',
      hoverinfo: 'label+value+percent',
      hovertemplate: '<b>%{label}</b><br>%{value:.1f} kWh<br>%{percent}<extra></extra>',
    }], {
      paper_bgcolor: bg,
      font: { color: text, family: 'DM Sans', size: 12 },
      showlegend: true,
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.08, font: { size: 11 } },
      margin: { l: 10, r: 10, t: 10, b: 60 },
      autosize: true,
      annotations: [{
        text: `<b>${((selfConsumed / (kpiData.totalProduced || 1)) * 100).toFixed(0)}%</b><br>auto`,
        x: 0.5, y: 0.5, showarrow: false,
        font: { size: 16, color: isDark ? '#f1f5f9' : '#0f172a' },
        xanchor: 'center', yanchor: 'middle',
      }],
    }, { responsive: true, displayModeBar: false });
  }, [kpiData, isDark]);

  return (
    <div className="card p-5">
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        🥧 Répartition énergie
      </h3>
      <div ref={ref} style={{ width: '100%', height: 320 }} />
    </div>
  );
}
