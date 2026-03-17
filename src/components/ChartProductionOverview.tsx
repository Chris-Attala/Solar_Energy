import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData, OpenMeteoData } from '../types/energy';
import { format, isAfter, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';

interface Props {
  data: EnergyData[];
  expectedData: OpenMeteoData[];   // archive (passé)
  forecastData: OpenMeteoData[];   // forecast (futur + aujourd'hui)

}

function aggregateOpenMeteo(
  items: OpenMeteoData[],
  granularity: Granularity
): Map<string, { expectedProduction: number; solarRadiation: number }> {
  const map = new Map<string, { expectedProduction: number; solarRadiation: number }>();
  items.forEach(d => {
    let key: string;
    if (granularity === 'weekly') {
      key = format(startOfWeek(d.date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (granularity === 'monthly') {
      key = format(startOfMonth(d.date), 'yyyy-MM-dd');
    } else {
      key = format(d.date, 'yyyy-MM-dd');
    }
    const ex = map.get(key);
    if (ex) {
      ex.expectedProduction += d.expectedProduction;
      ex.solarRadiation     += d.solarRadiation;
    } else {
      map.set(key, { expectedProduction: d.expectedProduction, solarRadiation: d.solarRadiation });
    }
  });
  return map;
}

export function ChartProductionOverview({ data, expectedData, forecastData }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const granularity = 'daily' as const;

  useEffect(() => {
    if (!ref.current) return;

    const bg   = '#0d1520';
    const text = '#94a3b8';
    const grid = '#1e293b';
    const today = startOfDay(new Date());

    // Limiter les données réelles aux 7 derniers jours
    const cutoff = subDays(today, 7);
    const recentData = data.filter(d => !isAfter(cutoff, d.date));

    // Agréger archive et forecast selon granularité
    const archiveMap  = aggregateOpenMeteo(expectedData, granularity);
    const forecastMap = aggregateOpenMeteo(forecastData, granularity);

    // Fusionner : pour chaque date du forecast, utiliser forecast si date >= aujourd'hui, sinon archive
    const allDatesSet = new Set<string>([
      ...Array.from(archiveMap.keys()),
      ...Array.from(forecastMap.keys()),
    ]);
    // Aussi ajouter les dates réelles CSV (30 derniers jours)
    recentData.forEach(d => {
      let key: string;
      if (granularity === 'weekly')       key = format(startOfWeek(d.date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      else if (granularity === 'monthly') key = format(startOfMonth(d.date), 'yyyy-MM-dd');
      else                                key = format(d.date, 'yyyy-MM-dd');
      allDatesSet.add(key);
    });

    const allDates = Array.from(allDatesSet).sort();

    // Données réelles agrégées
    const realMap = new Map<string, number>();
    if (granularity === 'daily') {
      recentData.forEach(d => realMap.set(format(d.date, 'yyyy-MM-dd'), d.produced));
    } else {
      recentData.forEach(d => {
        const key = granularity === 'weekly'
          ? format(startOfWeek(d.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          : format(startOfMonth(d.date), 'yyyy-MM-dd');
        realMap.set(key, (realMap.get(key) ?? 0) + d.produced);
      });
    }

    // Construire les séries
    const realDates: string[]     = [];
    const realY: number[]         = [];
    const forecastDates: string[] = [];
    const forecastY: number[]     = [];
    const irradianceDates: string[] = [];
    const irradianceY: number[]   = [];

    allDates.forEach(dateKey => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const isFuture = isAfter(dateObj, today);

      // Production réelle — seulement si on a la donnée
      if (realMap.has(dateKey)) {
        realDates.push(dateKey);
        realY.push(realMap.get(dateKey)!);
      }

      // Prévision — forecast pour futur/aujourd'hui, archive pour passé
      const fcast = forecastMap.get(dateKey);
      const arch  = archiveMap.get(dateKey);
      const source = (isFuture || forecastMap.has(dateKey)) ? fcast : arch;
      if (source && source.expectedProduction > 0) {
        forecastDates.push(dateKey);
        forecastY.push(source.expectedProduction);
      }

      // Ensoleillement
      const radSource = isFuture ? fcast : (arch ?? fcast);
      if (radSource && radSource.solarRadiation > 0) {
        irradianceDates.push(dateKey);
        irradianceY.push(radSource.solarRadiation);
      }
    });

    const hasIrradiance = irradianceY.length > 0;

    const traces: Plotly.Data[] = [];

    // Barres ensoleillement en fond (axe Y2)
    if (hasIrradiance) {
      traces.push({
        x: irradianceDates,
        y: irradianceY,
        type: 'bar',
        name: 'Ensoleillement (MJ/m²)',
        marker: { color: 'rgba(251,191,36,0.18)' },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Irradiance : %{y:.0f} MJ/m²<extra></extra>',
      });
    }

    // Prévision (ligne pointillée orange)
    if (forecastY.length > 0) {
      traces.push({
        x: forecastDates,
        y: forecastY,
        type: 'scatter',
        mode: 'lines',
        name: 'Prévision Open-Meteo',
        line: { color: '#f59e0b', width: 2, dash: 'dash' },
        hovertemplate: '<b>%{x}</b><br>Prévu : %{y:.2f} kWh<extra></extra>',
      });
    }

    // Production réelle (ligne verte pleine)
    if (realY.length > 0) {
      traces.push({
        x: realDates,
        y: realY,
        type: 'scatter',
        mode: 'lines',
        name: 'Production réelle',
        line: { color: '#22c55e', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(34,197,94,0.1)',
        hovertemplate: '<b>%{x}</b><br>Réel : %{y:.2f} kWh<extra></extra>',
      });
    }

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: bg,
      plot_bgcolor:  bg,
      font: { color: text, family: 'DM Sans' },
      xaxis: { gridcolor: grid, color: text, zeroline: false },
      yaxis: {
        title: { text: 'Production (kWh)', font: { color: '#22c55e' } },
        gridcolor: grid,
        tickfont: { color: '#22c55e' },
        zeroline: false,
      },
      ...(hasIrradiance ? {
        yaxis2: {
          overlaying: 'y',
          side: 'right',
          title: { text: 'Ensoleillement (MJ/m²)', font: { color: '#f59e0b' } },
          tickfont: { color: '#f59e0b' },
          showgrid: false,
          zeroline: false,
        }
      } : {}),
      legend: { orientation: 'h', x: 0, y: 1.10, font: { size: 11 } },
      margin: { l: 55, r: hasIrradiance ? 60 : 20, t: 35, b: 45 },
      hovermode: 'x unified' as const,
      dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    };

    Plotly.react(ref.current, traces, layout, {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false,
      doubleClick: false as const,
    });
  }, [data, expectedData, forecastData]);

  return (
    <div className="card p-5 mb-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-display">
          Production réelle & prévision 14 jours
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Vert : 7 derniers jours réels · Pointillés : prévision Open-Meteo · Fond : ensoleillement
        </p>
      </div>
      <div ref={ref} style={{ width: '100%', height: 340 }} />
    </div>
  );
}
