import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData, OpenMeteoData } from '../types/energy';
import { format } from 'date-fns';

interface Props { data: EnergyData[]; expectedData: OpenMeteoData[]; isDark: boolean; }

export function ProductionChart({ data, expectedData, isDark }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const bg   = isDark ? '#0d1520' : '#ffffff';
    const text = isDark ? '#94a3b8' : '#475569';
    const grid = isDark ? '#1e293b' : '#f1f5f9';

    // Align expected data to actual dates via lookup map
    const expectedMap = new Map<string, OpenMeteoData>();
    expectedData.forEach(d => expectedMap.set(format(d.date, 'yyyy-MM-dd'), d));

    const dates    = data.map(d => format(d.date, 'yyyy-MM-dd'));
    const produced = data.map(d => d.produced);

    const matchedExpected = dates.map(dt => expectedMap.get(dt) ?? null);
    const hasExpected = matchedExpected.some(v => v !== null && v!.expectedProduction > 0);
    const hasIrradiance = matchedExpected.some(v => v !== null && v!.solarRadiation > 0);

    // Always build a simple layout first — only add yaxis2 if we have irradiance data
    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: bg,
      plot_bgcolor:  bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text, showline: false, zeroline: false },
      yaxis: {
        gridcolor: grid, color: '#22c55e',
        title: { text: 'Production (kWh)', font: { color: '#22c55e' } },
        tickfont: { color: '#22c55e' },
        zeroline: false,
      },
      legend: { orientation: 'h' as const, x: 0, y: 1.12, font: { size: 11 } },
      margin: { l: 65, r: hasIrradiance ? 65 : 20, t: 20, b: 45 },
      hovermode: 'x unified' as const,
      autosize: true,
    };

    // Only add yaxis2 when we actually have irradiance values
    if (hasIrradiance) {
      (layout as any).yaxis2 = {
        overlaying: 'y',
        side: 'right',
        title: { text: 'Ensoleillement (MJ/m²)', font: { color: '#fbbf24' } },
        tickfont: { color: '#fbbf24' },
        showgrid: false,
        zeroline: false,
      };
    }

    const traces: Plotly.Data[] = [
      {
        x: dates,
        y: produced,
        type: 'scatter',
        mode: 'lines',
        name: 'Production réelle',
        line: { color: '#22c55e', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(34,197,94,0.08)',
        hovertemplate: '<b>%{x}</b><br>Réel : %{y:.2f} kWh<extra></extra>',
      },
    ];

    if (hasExpected) {
      traces.push({
        x: dates,
        y: matchedExpected.map(v => v?.expectedProduction ?? null) as number[],
        type: 'scatter',
        mode: 'lines',
        name: 'Attendu Open-Meteo',
        line: { color: '#f59e0b', width: 2, dash: 'dash' },
        hovertemplate: '<b>%{x}</b><br>Attendu : %{y:.2f} kWh<extra></extra>',
      });
    }

    if (hasIrradiance) {
      traces.push({
        x: dates,
        y: matchedExpected.map(v => v?.solarRadiation ?? null) as number[],
        type: 'bar',
        name: 'Ensoleillement (MJ/m²)',
        marker: { color: 'rgba(251,191,36,0.2)' },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Irradiance : %{y:.0f} MJ/m²<extra></extra>',
      });
    }

    Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: false });

  }, [data, expectedData, isDark]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          📈 Production réelle vs attendue + ensoleillement
        </h3>
        {expectedData.length === 0 && (
          <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            Chargement Open-Meteo…
          </span>
        )}
      </div>
      <div ref={ref} style={{ width: '100%', height: 380 }} />
    </div>
  );
}
