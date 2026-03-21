import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { MonthlyProjection } from '../types/energy';
import { useTheme, plotThemeColors } from '../context/ThemeContext';
import { MONTHLY_PROJECTION_ARCHIVE_YEARS } from '../utils/openMeteo';

interface Props {
  monthlyProjections: MonthlyProjection[];
  avgDailyConsumption: number;
}

const SEASON_COLORS: Record<number, string> = {
  0: '#38bdf8', 1: '#38bdf8', 2: '#22c55e', 3: '#22c55e', 4: '#22c55e',
  5: '#f59e0b', 6: '#f59e0b', 7: '#f59e0b', 8: '#f97316', 9: '#f97316',
  10: '#f97316', 11: '#38bdf8',
};

export function Chart12Months({ monthlyProjections, avgDailyConsumption }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!ref.current || monthlyProjections.length === 0) return;

    const pt = plotThemeColors(isDark);

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
        line: { color: pt.text, width: 2, dash: 'dot' },
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
      paper_bgcolor: pt.paper,
      plot_bgcolor: pt.plot,
      separators: pt.separators,
      font: { color: pt.text, family: 'DM Sans' },
      xaxis: { gridcolor: pt.grid, color: pt.text },
      yaxis: {
        title: { text: 'Énergie (kWh)', font: { color: pt.text } },
        gridcolor: pt.grid,
        tickfont: { color: pt.text },
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

  }, [monthlyProjections, avgDailyConsumption, isDark]);

  return (
    <div className="card p-5 mb-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-theme-secondary mb-1 font-display">
        Projection 12 prochains mois
      </h3>
      <p className="text-xs text-theme-muted mb-4">
        Barres : kWh <strong className="text-theme-secondary">prévus</strong> (moyenne {MONTHLY_PROJECTION_ARCHIVE_YEARS}{' '}
        ans, même mois, Open-Meteo × <strong className="text-theme-secondary">rendement mesuré</strong> sur votre passé) ·
        pointillés : conso. · vert : économies (€)
      </p>
      <div ref={ref} style={{ width: '100%', height: 340 }} />
    </div>
  );
}
