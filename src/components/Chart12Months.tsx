import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { MonthlyProjection } from '../types/energy';

interface Props {
  monthlyProjections: MonthlyProjection[];
  avgDailyConsumption: number;
  electricityPrice: number;
}

const SEASON_COLORS: Record<number, string> = {
  0: '#38bdf8', 1: '#38bdf8', 2: '#22c55e', 3: '#22c55e', 4: '#22c55e',
  5: '#f59e0b', 6: '#f59e0b', 7: '#f59e0b', 8: '#f97316', 9: '#f97316',
  10: '#f97316', 11: '#38bdf8',
};

export function Chart12Months({ monthlyProjections, avgDailyConsumption, electricityPrice }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || monthlyProjections.length === 0) return;

    const bg   = '#0d1520';
    const text = '#94a3b8';
    const grid = '#1e293b';

    const months     = monthlyProjections.map(m => m.month);
    const production = monthlyProjections.map(m => m.production);
    const savings    = monthlyProjections.map(m => m.savings);

    // Consommation mensuelle = moyenne journalière × jours du mois
    // Ligne horizontale si la consommation est stable (valeur identique chaque mois serait une droite,
    // mais les mois ont des durées différentes donc légère variation — c'est correct)
    const consumption = monthlyProjections.map(m => avgDailyConsumption * m.daysInMonth);

    const colors = monthlyProjections.map(m => SEASON_COLORS[m.monthIndex] ?? '#64748b');

    const traces: Plotly.Data[] = [
      {
        x: months,
        y: production,
        type: 'bar',
        name: 'Production projetée (kWh)',
        marker: { color: colors },
        hovertemplate: '<b>%{x}</b><br>Production : %{y:.0f} kWh<extra></extra>',
      },
      {
        x: months,
        y: consumption,
        type: 'scatter',
        mode: 'lines',
        name: 'Consommation mensuelle (kWh)',
        line: { color: '#94a3b8', width: 2, dash: 'dot' },
        hovertemplate: '<b>%{x}</b><br>Conso. : %{y:.0f} kWh<extra></extra>',
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
    ];

    Plotly.react(ref.current, traces, {
      paper_bgcolor: bg,
      plot_bgcolor:  bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text },
      yaxis: {
        title: { text: 'Énergie (kWh)', font: { color: text } },
        gridcolor: grid,
        tickfont: { color: text },
        zeroline: false,
      },
      yaxis2: {
        overlaying: 'y',
        side: 'right',
        title: { text: 'Économies (€)', font: { color: '#22c55e' } },
        tickfont: { color: '#22c55e' },
        showgrid: false,
        zeroline: false,
      },
      legend: { orientation: 'h', x: 0, y: -0.18, font: { size: 10 } },
      margin: { l: 55, r: 55, t: 15, b: 80 },
      bargap: 0.25,
      hovermode: 'x unified' as const, dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    }, { responsive: true, displayModeBar: false, scrollZoom: false, doubleClick: false as const });

  }, [monthlyProjections, avgDailyConsumption, electricityPrice]);

  return (
    <div className="card p-5 mb-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1 font-display">
        Projection 12 prochains mois
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Barres : production projetée · Pointillés : votre consommation mensuelle · Ligne verte : économies
      </p>
      <div ref={ref} style={{ width: '100%', height: 340 }} />
    </div>
  );
}
