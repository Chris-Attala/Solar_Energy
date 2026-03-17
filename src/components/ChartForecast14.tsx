import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { OpenMeteoData } from '../types/energy';
import { format, isToday } from 'date-fns';

interface Props {
  forecastData: OpenMeteoData[];
}

export function ChartForecast14({ forecastData }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || forecastData.length === 0) return;

    const bg = '#0d1520';
    const text = '#94a3b8';
    const grid = '#1e293b';

    const dates = forecastData.map((d) => format(d.date, 'yyyy-MM-dd'));
    const production = forecastData.map((d) => d.expectedProduction);
    const colors = forecastData.map((d) => (isToday(d.date) ? '#15803d' : 'rgba(34,197,94,0.5)'));

    const trace: Plotly.Data = {
      x: dates,
      y: production,
      type: 'bar',
      name: 'Prévision (kWh)',
      marker: { color: colors },
      hovertemplate: '<b>%{x}</b><br>Prévision : %{y:.2f} kWh<extra></extra>',
    };

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
      margin: { l: 55, r: 20, t: 30, b: 45 },
      hovermode: 'x unified',
      autosize: true,
      showlegend: false,
    };

    Plotly.react(ref.current, [trace], layout, { responsive: true, displayModeBar: false, staticPlot: false, scrollZoom: false, doubleClick: false, showTips: false, modeBarButtonsToRemove: ["zoom2d","pan2d","select2d","lasso2d","zoomIn2d","zoomOut2d","autoScale2d","resetScale2d"] });
  }, [forecastData]);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 font-display">
        Prévision 14 jours Open-Meteo
      </h3>
      <div ref={ref} style={{ width: '100%', height: 300 }} />
    </div>
  );
}
