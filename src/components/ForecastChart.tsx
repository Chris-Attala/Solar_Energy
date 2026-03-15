import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { OpenMeteoData } from '../types/energy';
import { format, isToday, isBefore } from 'date-fns';

interface Props { forecastData: OpenMeteoData[]; isDark: boolean; }

export function ForecastChart({ forecastData, isDark }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || forecastData.length === 0) return;
    const bg   = isDark ? '#0d1520' : '#ffffff';
    const text = isDark ? '#94a3b8'  : '#475569';
    const grid = isDark ? '#1e293b'  : '#f1f5f9';
    const today = new Date();

    const past   = forecastData.filter(d => isBefore(d.date, today) || isToday(d.date));
    const future = forecastData.filter(d => !isBefore(d.date, today) || isToday(d.date));

    const traces: Plotly.Data[] = [
      {
        x: past.map(d => format(d.date, 'yyyy-MM-dd')),
        y: past.map(d => d.expectedProduction),
        type: 'bar', name: 'Réalisé',
        marker: { color: 'rgba(34,197,94,0.7)', line: { color: '#16a34a', width: 1 } },
      },
      {
        x: future.map(d => format(d.date, 'yyyy-MM-dd')),
        y: future.map(d => d.expectedProduction),
        type: 'bar', name: 'Prévision',
        marker: { color: 'rgba(139,92,246,0.6)', line: { color: '#7c3aed', width: 1 } },
      },
    ];

    Plotly.react(ref.current, traces, {
      barmode: 'overlay',
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text, zeroline: false },
      yaxis: { gridcolor: grid, color: text, title: 'kWh estimés', zeroline: false },
      legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 12 } },
      margin: { l: 55, r: 16, t: 16, b: 45 },
      hovermode: 'x unified',
      autosize: true,
      shapes: [{
        type: 'line',
        x0: format(today, 'yyyy-MM-dd'), x1: format(today, 'yyyy-MM-dd'),
        y0: 0, y1: 1, yref: 'paper',
        line: { color: '#f59e0b', width: 2, dash: 'dot' },
      }],
    }, { responsive: true, displayModeBar: false });
  }, [forecastData, isDark]);

  return (
    <div className="card p-5">
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        🔮 Prévision 14 jours (Open-Meteo)
      </h3>
      <div ref={ref} style={{ width: '100%', height: 320 }} />
    </div>
  );
}
