import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData, OpenMeteoData, Granularity } from '../types/energy';
import { format, startOfWeek, startOfMonth } from 'date-fns';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Jour' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'monthly', label: 'Mois' },
];

interface Props {
  data: EnergyData[];
  expectedData: OpenMeteoData[];
  granularity: Granularity;
  onGranularity: (g: Granularity) => void;
}

export function ChartRealVsExpected({ data, expectedData, granularity, onGranularity }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const bg = '#0d1520';
    const text = '#94a3b8';
    const grid = '#1e293b';

    const expectedMap = new Map<string, OpenMeteoData>();
    if (granularity === 'daily') {
      expectedData.forEach((d) => expectedMap.set(format(d.date, 'yyyy-MM-dd'), d));
    } else {
      const agg = new Map<string, { expectedProduction: number; solarRadiation: number; date: Date }>();
      expectedData.forEach((d) => {
        const key =
          granularity === 'weekly'
            ? format(startOfWeek(d.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            : format(startOfMonth(d.date), 'yyyy-MM-dd');
        const ex = agg.get(key);
        const [y, m, day] = key.split('-').map(Number);
        const periodDate = new Date(y, m - 1, day);
        if (ex) {
          ex.expectedProduction += d.expectedProduction;
          ex.solarRadiation += d.solarRadiation;
        } else {
          agg.set(key, {
            expectedProduction: d.expectedProduction,
            solarRadiation: d.solarRadiation,
            date: periodDate,
          });
        }
      });
      agg.forEach((v, k) =>
        expectedMap.set(k, {
          date: v.date,
          expectedProduction: v.expectedProduction,
          solarRadiation: v.solarRadiation,
        })
      );
    }

    const dates = data.map((d) => format(d.date, 'yyyy-MM-dd'));
    const produced = data.map((d) => d.produced);
    const matched = dates.map((dt) => expectedMap.get(dt) ?? null);
    const expectedY = matched.map((v) => (v != null ? v.expectedProduction : null));
    const irradianceY = matched.map((v) => (v != null ? v.solarRadiation : null));
    const hasExpected = matched.some((v) => v != null && v.expectedProduction > 0);
    const hasIrradiance = matched.some((v) => v != null && v.solarRadiation > 0);

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
      legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 11 } },
      margin: { l: 55, r: hasIrradiance ? 55 : 20, t: 30, b: 45 },
      hovermode: 'x unified',
      autosize: true,
    };

    if (hasIrradiance) {
      (layout as Record<string, unknown>).yaxis2 = {
        overlaying: 'y',
        side: 'right',
        title: { text: 'Ensoleillement (MJ/m²)', font: { color: '#f59e0b' } },
        tickfont: { color: '#f59e0b' },
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
        name: 'Réel',
        line: { color: '#22c55e', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(34,197,94,0.1)',
        hovertemplate: '<b>%{x}</b><br>Réel : %{y:.2f} kWh<extra></extra>',
      },
    ];

    if (hasExpected) {
      traces.push({
        x: dates,
        y: expectedY,
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
        y: irradianceY,
        type: 'bar',
        name: 'Ensoleillement (MJ/m²)',
        marker: { color: 'rgba(251,191,36,0.25)' },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Irradiance : %{y:.0f} MJ/m²<extra></extra>',
      });
    }

    Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: false });
  }, [data, expectedData, granularity]);

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-display">
          Réel vs Attendu + ensoleillement
        </h3>
        <div className="flex gap-1 p-1 rounded-lg bg-slate-800/80 w-fit">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGranularity(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                granularity === opt.value
                  ? 'bg-[#22c55e] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={ref} style={{ width: '100%', height: 300 }} />
    </div>
  );
}
