import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { getSeasonalBreakdown } from '../utils/dataProcessing';
import { EnergyData } from '../types/energy';
import { useTheme, plotThemeColors } from '../context/ThemeContext';

interface Props {
  data: EnergyData[];
  electricityPrice: number;
}

export function ChartSeasonal({ data, electricityPrice }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const breakdown = getSeasonalBreakdown(data, electricityPrice);

    const labels     = breakdown.map(b => b.isEstimate ? `${b.label} *` : b.label);
    const production = breakdown.map(b => b.production);
    const savings    = breakdown.map(b => b.savings);
    const importKwh  = breakdown.map(b => electricityPrice > 0 ? b.importCost / electricityPrice : 0);
    const importCosts = breakdown.map(b => b.importCost);
    const withData   = breakdown;

    // Consommation = autoconsommé (savings/price) + importé (importCost/price)
    const consumptionKwh = breakdown.map(b => {
      if (b.days === 0) return 0;
      const selfConsumed = electricityPrice > 0 ? b.savings / electricityPrice : 0;
      const imported = electricityPrice > 0 ? b.importCost / electricityPrice : 0;
      return selfConsumed + imported;
    });

    const traces: Plotly.Data[] = [
      {
        x: labels,
        y: production,
        type: 'bar',
        name: 'Production (kWh)',
        marker: { color: '#f59e0b' },
        legendrank: 1,
        customdata: savings,
        hovertemplate: withData.map(b =>
          `<b>${b.label}</b><br>Production : %{y:.0f} kWh<br>Économies : %{customdata:.0f} €${b.isEstimate ? `<br><i>Estimé sur ${b.days}j → ${b.totalDays}j</i>` : ''}<extra></extra>`
        ),
      },
      {
        x: labels,
        y: consumptionKwh,
        type: 'bar',
        name: 'Consommation (kWh)',
        marker: { color: '#a78bfa' },
        hovertemplate: '<b>%{x}</b><br>Consommation : %{y:.0f} kWh<extra></extra>',
      },

      {
        x: labels,
        y: importKwh,
        type: 'bar',
        name: 'Importé (kWh)',
        marker: { color: '#f87171' },
        customdata: importCosts,
        hovertemplate: '<b>%{x}</b><br>Importé : %{y:.0f} kWh<br>Coût : %{customdata:.0f} €<extra></extra>',
      },
    ];

    const pt = plotThemeColors(isDark);
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
      margin: { l: 55, r: 20, t: 20, b: 55 },
      barmode: 'group',
      bargap: 0.2,
      bargroupgap: 0.05,
      legend: { orientation: 'h', x: 0, y: -0.18, font: { size: 11 } },
      hovermode: 'x unified' as const,
      dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    }, { responsive: true, displayModeBar: false, scrollZoom: false, doubleClick: false as const });

  }, [data, electricityPrice, isDark]);

  // Vérifier s'il y a des estimations
  const breakdown   = getSeasonalBreakdown(data, electricityPrice);
  const hasEstimate = breakdown.some(b => b.isEstimate);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-theme-secondary mb-1 font-display">
        Par saison
      </h3>
      <p className="text-xs text-theme-muted mb-4">
        Production (+ économies au survol) · Consommation · Importé
        {hasEstimate && <span className="ml-2">· * = extrapolé sur la saison entière</span>}
      </p>
      <div ref={ref} style={{ width: '100%', height: 300 }} />
    </div>
  );
}