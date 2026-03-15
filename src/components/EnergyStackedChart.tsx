import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData } from '../types/energy';
import { format } from 'date-fns';

interface Props { data: EnergyData[]; isDark: boolean; }

export function EnergyStackedChart({ data, isDark }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bg   = isDark ? '#0d1520' : '#ffffff';
    const text = isDark ? '#94a3b8'  : '#475569';
    const grid = isDark ? '#1e293b'  : '#f1f5f9';
    const dates = data.map(d => format(d.date, 'yyyy-MM-dd'));

    const traces: Plotly.Data[] = [
      { x: dates, y: data.map(d => d.produced),  type: 'bar', name: 'Produit',  marker: { color: '#22c55e' } },
      { x: dates, y: data.map(d => d.consumed),  type: 'bar', name: 'Consommé', marker: { color: '#38bdf8' } },
      { x: dates, y: data.map(d => d.exported),  type: 'bar', name: 'Exporté',  marker: { color: '#f59e0b' } },
      { x: dates, y: data.map(d => d.imported),  type: 'bar', name: 'Importé',  marker: { color: '#f43f5e' } },
    ];

    Plotly.react(ref.current, traces, {
      barmode: 'group',
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text, zeroline: false },
      yaxis: { gridcolor: grid, color: text, title: 'kWh', zeroline: false },
      legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 12 } },
      margin: { l: 50, r: 16, t: 16, b: 45 },
      hovermode: 'x unified',
      bargap: 0.25, bargroupgap: 0.05,
      autosize: true,
    }, { responsive: true, displayModeBar: false });
  }, [data, isDark]);

  return (
    <div className="card p-5">
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        ⚡ Flux énergétiques quotidiens
      </h3>
      <div ref={ref} style={{ width: '100%', height: 360 }} />
    </div>
  );
}
