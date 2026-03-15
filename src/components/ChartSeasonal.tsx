import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { getSeasonalBreakdown } from '../utils/dataProcessing';
import { EnergyData } from '../types/energy';

interface Props {
  data: EnergyData[];
  electricityPrice: number;
}

export function ChartSeasonal({ data, electricityPrice }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const breakdown = getSeasonalBreakdown(data, electricityPrice);
    const labels = breakdown.map((b) => b.label);

    const production = breakdown.map((b) => b.production);
    const savings = breakdown.map((b) => b.savings);
    const importCost = breakdown.map((b) => b.importCost);
    const colors = breakdown.map((b) => b.color);

    const traces: Plotly.Data[] = [
      {
        x: labels,
        y: production,
        type: 'bar',
        name: 'Production (kWh)',
        marker: { color: colors },
        hovertemplate: '<b>%{x}</b><br>Production : %{y:.0f} kWh<extra></extra>',
      },
      {
        x: labels,
        y: savings,
        type: 'bar',
        name: 'Économies (€)',
        marker: { color: '#22c55e' },
        hovertemplate: '<b>%{x}</b><br>Économies : %{y:.2f} €<extra></extra>',
      },
      {
        x: labels,
        y: importCost,
        type: 'bar',
        name: 'Coût import (€)',
        marker: { color: '#f87171' },
        hovertemplate: '<b>%{x}</b><br>Coût import : %{y:.2f} €<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#0d1520',
      plot_bgcolor: '#0d1520',
      font: { color: '#94a3b8', family: 'DM Sans' },
      xaxis: { gridcolor: '#1e293b', color: '#94a3b8' },
      yaxis: {
        title: { text: 'kWh / €', font: { color: '#94a3b8' } },
        gridcolor: '#1e293b',
        tickfont: { color: '#94a3b8' },
        zeroline: false,
      },
      margin: { l: 55, r: 20, t: 30, b: 45 },
      barmode: 'group',
      bargap: 0.2,
      bargroupgap: 0.05,
      legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 11 } },
      hovermode: 'x unified',
      autosize: true,
    };

    Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: false });
  }, [data, electricityPrice]);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1 font-display">
        Par saison
      </h3>
      <p className="text-xs text-slate-500 mb-4">Production · Économies · Coût import (€)</p>
      <div ref={ref} style={{ width: '100%', height: 300 }} />
    </div>
  );
}
