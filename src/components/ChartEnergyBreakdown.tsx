import { useEffect, useRef, useMemo, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData } from '../types/energy';
import { useTheme, plotThemeColors } from '../context/ThemeContext';
import {
  buildProductionRepartitionBuckets,
  type RepartitionWindowMode,
} from '../utils/dataProcessing';

interface Props {
  data: EnergyData[];
}

const WINDOW_OPTIONS: { value: RepartitionWindowMode; label: string }[] = [
  { value: 'days', label: '4 jours' },
  { value: 'weeks', label: '4 sem.' },
  { value: 'months', label: '4 mois' },
];

export function ChartEnergyBreakdown({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [mode, setMode] = useState<RepartitionWindowMode>('weeks');

  const buckets = useMemo(() => buildProductionRepartitionBuckets(data, mode), [data, mode]);

  useEffect(() => {
    if (!ref.current || buckets.length === 0) return;

    const labels = buckets.map((b) => b.label);
    const self = buckets.map((b) => b.selfConsumed);
    const exp = buckets.map((b) => b.exported);

    const pctSelf = self.map((s, i) => {
      const t = s + exp[i];
      return t > 0 ? Math.round((s / t) * 100) : 0;
    });
    const pctExp = self.map((s, i) => {
      const t = s + exp[i];
      return t > 0 ? Math.round((exp[i] / t) * 100) : 0;
    });

    const minKwhLabel = 0.5;
    const textSelf = self.map((s, i) =>
      s >= minKwhLabel && pctSelf[i] > 0 ? `${pctSelf[i]}\u202f%` : ''
    );
    const textExp = exp.map((e, i) =>
      e >= minKwhLabel && pctExp[i] > 0 ? `${pctExp[i]}\u202f%` : ''
    );

    const traces: Plotly.Data[] = [
      {
        type: 'bar',
        name: 'Autoconsommé',
        x: labels,
        y: self,
        text: textSelf,
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { color: '#ffffff', size: 12, family: 'DM Sans' },
        marker: { color: '#22c55e' },
        customdata: pctSelf,
        hovertemplate:
          '<b>%{x}</b><br>Autoconsommé : %{y:.0f} kWh (%{customdata}\u202f%)<extra></extra>',
      },
      {
        type: 'bar',
        name: 'Exporté',
        x: labels,
        y: exp,
        text: textExp,
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { color: '#0f172a', size: 12, family: 'DM Sans' },
        marker: { color: '#f59e0b' },
        customdata: pctExp,
        hovertemplate:
          '<b>%{x}</b><br>Exporté : %{y:.0f} kWh (%{customdata}\u202f%)<extra></extra>',
      },
    ];

    const pt = plotThemeColors(isDark);
    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: pt.paper,
      plot_bgcolor: pt.plot,
      separators: pt.separators,
      font: { color: pt.text, family: 'DM Sans', size: 11 },
      barmode: 'stack',
      margin: { l: 48, r: 16, t: 8, b: 72 },
      xaxis: {
        gridcolor: pt.grid,
        color: pt.text,
        tickangle: -28,
        zeroline: false,
      },
      yaxis: {
        title: { text: 'kWh', font: { color: pt.text, size: 11 } },
        gridcolor: pt.grid,
        color: pt.text,
        zeroline: false,
      },
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.22,
        font: { size: 10 },
      },
      showlegend: true,
      dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    };

    Plotly.react(ref.current, traces, layout, {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false,
      doubleClick: false as const,
      showTips: false,
    });
  }, [buckets, isDark]);

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-theme-secondary font-display">
            Répartition
          </h3>
          <p className="text-xs text-theme-muted mt-0.5">
            Production : autoconsommé vs exporté (dernières tranches selon la vue)
          </p>
        </div>
        <div className="surface-muted flex gap-1 p-1 rounded-lg self-start">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === opt.value
                  ? 'bg-[#22c55e] text-white'
                  : 'text-theme-secondary hover:text-theme'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {buckets.length === 0 ? (
        <div className="surface-muted flex items-center justify-center rounded-xl text-theme-secondary text-sm py-16">
          Pas assez de données pour cette vue.
        </div>
      ) : (
        <div ref={ref} style={{ width: '100%', height: 300 }} />
      )}
    </div>
  );
}
