import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { MonthlyProjection } from '../types/energy';

interface Props {
  monthlyProjections: MonthlyProjection[];
  avgDailyConsumption: number;
  autoconsRate: number;
  electricityPrice: number;
}

const SEASON_COLORS: Record<number, string> = {
  0: '#38bdf8', 1: '#38bdf8', 2: '#22c55e', 3: '#22c55e', 4: '#22c55e', 5: '#f59e0b',
  6: '#f59e0b', 7: '#f59e0b', 8: '#f97316', 9: '#f97316', 10: '#f97316', 11: '#38bdf8',
};

export function Chart12Months({
  monthlyProjections,
  avgDailyConsumption,
  autoconsRate,
  electricityPrice,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || monthlyProjections.length === 0) return;

    const bg = '#0d1520';
    const text = '#94a3b8';
    const grid = '#1e293b';

    const months = monthlyProjections.map((m) => m.month);
    const production = monthlyProjections.map((m) => m.production);
    const savings = monthlyProjections.map((m) => m.savings);
    const importCosts = monthlyProjections.map((m) => {
      const consumptionEst = avgDailyConsumption * m.daysInMonth;
      const selfConsumedEst = m.production * autoconsRate;
      const importEst = Math.max(0, consumptionEst - selfConsumedEst);
      return importEst * electricityPrice;
    });
    const colors = monthlyProjections.map((m) => SEASON_COLORS[m.monthIndex] ?? '#64748b');

    const traces: Plotly.Data[] = [
      {
        x: months,
        y: production,
        type: 'bar',
        name: 'Production (kWh)',
        marker: { color: colors },
        hovertemplate: '<b>%{x}</b><br>Production : %{y:.0f} kWh<extra></extra>',
      },
      {
        x: months,
        y: savings,
        type: 'scatter',
        mode: 'lines',
        name: 'Économies (€)',
        line: { color: '#22c55e', width: 2.5 },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Économies : %{y:.0f} €<extra></extra>',
      },
      {
        x: months,
        y: importCosts,
        type: 'scatter',
        mode: 'lines',
        name: 'Coût import estimé (€)',
        line: { color: '#f87171', width: 2, dash: 'dot' },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Coût import : %{y:.0f} €<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: bg,
      plot_bgcolor: bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text },
      yaxis: {
        title: { text: 'Production (kWh)', font: { color: '#22c55e' } },
        gridcolor: grid,
        tickfont: { color: '#22c55e' },
        zeroline: false,
      },
      yaxis2: {
        overlaying: 'y',
        side: 'right',
        title: { text: '€ (économies / coût import)', font: { color: '#f59e0b' } },
        tickfont: { color: '#f59e0b' },
        showgrid: false,
        zeroline: false,
      },
      legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 11 } },
      margin: { l: 55, r: 55, t: 30, b: 45 },
      bargap: 0.25,
      hovermode: 'x unified',
      autosize: true,
    };

    Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: false });
  }, [monthlyProjections, avgDailyConsumption, autoconsRate, electricityPrice]);

  return (
    <div className="card p-5 mb-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1 font-display">
        Projection 12 prochains mois
      </h3>
      <p className="text-xs text-slate-500 mb-4">Production · Économies · Coût import estimé (€)</p>
      <div ref={ref} style={{ width: '100%', height: 340 }} />
    </div>
  );
}
