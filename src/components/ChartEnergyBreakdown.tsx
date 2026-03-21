import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData } from '../types/energy';

interface Props {
  data: EnergyData[];
}

export function ChartEnergyBreakdown({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const totalProduced = data.reduce((s, d) => s + d.produced, 0);
    const totalConsumed = data.reduce((s, d) => s + d.consumed, 0);
    const totalExported = data.reduce((s, d) => s + d.exported, 0);
    const totalImported = data.reduce((s, d) => s + d.imported, 0);
    const selfConsumed = Math.max(0, totalProduced - totalExported);

    const labels = ['Autoconsommé', 'Exporté'];
    const values = [selfConsumed, totalExported];
    const colors = ['#22c55e', '#f59e0b'];

    const trace: Plotly.Data = {
      labels,
      values,
      type: 'pie',
      hole: 0.45,
      marker: { colors },
      textinfo: 'label+value+percent',
      textposition: 'outside',
      hovertemplate: '<b>%{label}</b><br>%{value:.0f} kWh (%{percent})<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#0d1520',
      plot_bgcolor: '#0d1520',
      font: { color: '#94a3b8', family: 'DM Sans', size: 11 },
      margin: { l: 15, r: 15, t: 15, b: 15 },
      showlegend: false, dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    };

    Plotly.react(ref.current, [trace], layout, { responsive: true, displayModeBar: false, staticPlot: false, scrollZoom: false, doubleClick: false, showTips: false, modeBarButtonsToRemove: ["zoom2d","pan2d","select2d","lasso2d","zoomIn2d","zoomOut2d","autoScale2d","resetScale2d"] });
  }, [data]);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1 font-display">
        Répartition
      </h3>
      <p className="text-xs text-slate-500 mb-4">Autoconsommé · Exporté (kWh)</p>
      <div ref={ref} style={{ width: '100%', height: 260 }} />
    </div>
  );
}