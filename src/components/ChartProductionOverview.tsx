import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData, OpenMeteoData } from '../types/energy';
import { useTheme, plotThemeColors } from '../context/ThemeContext';
import { calibratedDailyProduction } from '../utils/openMeteo';
import { dateToParisYmd, parisTodayYmd } from '../utils/parisDate';

/** Ajoute des jours en calendrier grégorien (UTC math, pas de DST sur la date seule) */
function addCalendarDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86400000;
  const x = new Date(t);
  const yy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(x.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function eachYmdFromToInclusive(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  while (cur <= endYmd) {
    out.push(cur);
    cur = addCalendarDaysYmd(cur, 1);
  }
  return out;
}

interface Props {
  data: EnergyData[];
  expectedData: OpenMeteoData[];
  forecastData: OpenMeteoData[];
  /** Rendement mesuré = production EMA / production théorique (soleil) ; sert à ajuster les prévisions */
  realPR: number;
}

function aggregateOpenMeteo(
  items: OpenMeteoData[]
): Map<string, { expectedProduction: number; solarRadiation: number }> {
  const map = new Map<string, { expectedProduction: number; solarRadiation: number }>();
  items.forEach((d) => {
    const key = dateToParisYmd(d.date);
    const ex = map.get(key);
    if (ex) {
      ex.expectedProduction += d.expectedProduction;
      ex.solarRadiation += d.solarRadiation;
    } else {
      map.set(key, { expectedProduction: d.expectedProduction, solarRadiation: d.solarRadiation });
    }
  });
  return map;
}

/**
 * Début du graphique : en général J−6 (Paris).
 * Si le CSV n’a pas encore « aujourd’hui » mais va au moins jusqu’à hier, on recule d’un jour
 * le début pour garder 7 jours avec production visible (sinon 6 points + jour vide).
 */
function resolveChartStartKey(todayKey: string, csvMap: Map<string, number>): string {
  const defaultStart = addCalendarDaysYmd(todayKey, -6);
  if (csvMap.has(todayKey)) return defaultStart;

  const yesterdayKey = addCalendarDaysYmd(todayKey, -1);
  const keys = [...csvMap.keys()].filter((k) => k <= todayKey).sort();
  const maxCsv = keys.length ? keys[keys.length - 1]! : null;
  if (!maxCsv || maxCsv < yesterdayKey) return defaultStart;

  const shiftedStart = addCalendarDaysYmd(maxCsv, -6);
  return shiftedStart < defaultStart ? shiftedStart : defaultStart;
}

function buildChartDateKeys(todayKey: string, csvMap: Map<string, number>): string[] {
  const startKey = resolveChartStartKey(todayKey, csvMap);
  const endKey = addCalendarDaysYmd(todayKey, 14);
  return eachYmdFromToInclusive(startKey, endKey);
}

export function ChartProductionOverview({ data, expectedData, forecastData, realPR }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!ref.current) return;

    const pt = plotThemeColors(isDark);
    const { paper: bg, plot, text, grid } = pt;
    const todayKey = parisTodayYmd();

    const archiveMap = aggregateOpenMeteo(expectedData);
    const forecastMap = aggregateOpenMeteo(forecastData);

    const csvMap = new Map<string, number>();
    data.forEach((d) => {
      const key = d.dateKey ?? dateToParisYmd(d.date);
      csvMap.set(key, d.produced);
    });

    const dateKeysInWindow = buildChartDateKeys(todayKey, csvMap);

    const realDates: string[] = [];
    const realY: (number | null)[] = [];
    const forecastDates: string[] = [];
    const forecastY: number[] = [];
    const irradianceDates: string[] = [];
    const irradianceY: number[] = [];

    /** Dernière irradiance > 0 vue (passé + prévision) pour combler le dernier jour si l’API a 1 jour de moins */
    let lastPositiveRad = 0;
    let lastFutureRad = 0;

    for (const dateKey of dateKeysInWindow) {
      const isFuture = dateKey > todayKey;

      let rad = 0;
      if (!isFuture) {
        rad = archiveMap.get(dateKey)?.solarRadiation ?? 0;
        if (rad <= 0) rad = forecastMap.get(dateKey)?.solarRadiation ?? 0;
      } else {
        const fc = forecastMap.get(dateKey);
        if (fc !== undefined) {
          rad = fc.solarRadiation;
        } else {
          // Jour hors plage API (ex. J+14 avec forecast_days trop court) : prolonge la dernière prévision
          rad = lastFutureRad > 0 ? lastFutureRad : lastPositiveRad;
        }
        if (rad > 0) lastFutureRad = rad;
      }

      if (rad > 0) lastPositiveRad = rad;

      if (rad > 0) {
        irradianceDates.push(dateKey);
        irradianceY.push(rad);
      }

      const prodCal = calibratedDailyProduction(rad, realPR);
      forecastDates.push(dateKey);
      forecastY.push(prodCal);

      if (!isFuture) {
        realDates.push(dateKey);
        realY.push(csvMap.has(dateKey) ? csvMap.get(dateKey)! : null);
      }
    }

    const hasIrradiance = irradianceY.length > 0;

    const traces: Plotly.Data[] = [];

    if (hasIrradiance) {
      traces.push({
        x: irradianceDates,
        y: irradianceY,
        type: 'bar',
        name: 'Ensoleillement (MJ/m²)',
        marker: { color: 'rgba(251,191,36,0.12)' },
        yaxis: 'y2',
        hovertemplate: '<b>%{x}</b><br>Irradiance : %{y:.0f} MJ/m²<extra></extra>',
      });
    }

    if (forecastY.length > 0) {
      traces.push({
        x: forecastDates,
        y: forecastY,
        type: 'scatter',
        mode: 'lines',
        name: 'Prévision kWh (météo × rendement mesuré)',
        line: { color: '#f59e0b', width: 2, dash: 'dash' },
        hovertemplate: '<b>%{x}</b><br>Prévision estimée : %{y:.2f} kWh<extra></extra>',
      });
    }

    if (realY.some((v) => v != null)) {
      traces.push({
        x: realDates,
        y: realY,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Production réelle',
        line: { color: '#22c55e', width: 2.5 },
        marker: { color: '#22c55e', size: 6, line: { width: 0 } },
        connectgaps: false,
        fill: 'tozeroy',
        fillcolor: 'rgba(34,197,94,0.1)',
        hovertemplate: '<b>%{x}</b><br>Réel : %{y:.2f} kWh<extra></extra>',
      });
    }

    const x0 = dateKeysInWindow[0];
    const x1 = dateKeysInWindow[dateKeysInWindow.length - 1];

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: bg,
      plot_bgcolor: plot,
      separators: pt.separators,
      font: { color: text, family: 'DM Sans' },
      xaxis: {
        gridcolor: grid,
        color: text,
        zeroline: false,
        range: [x0, x1],
        tickangle: -35,
      },
      yaxis: {
        autorange: true,
        title: { text: 'Production (kWh)', font: { color: '#22c55e' } },
        gridcolor: grid,
        tickfont: { color: '#22c55e' },
        zeroline: false,
      },
      ...(hasIrradiance
        ? {
            yaxis2: {
              overlaying: 'y',
              side: 'right',
              title: { text: 'Ensoleillement (MJ/m²)', font: { color: '#f59e0b' } },
              tickfont: { color: '#f59e0b' },
              showgrid: false,
              zeroline: false,
              range: [0, 35],
            },
          }
        : {}),
      legend: { orientation: 'h', x: 0, y: -0.18, font: { size: 10 } },
      margin: { l: 55, r: hasIrradiance ? 60 : 20, t: 15, b: 90 },
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
  }, [data, expectedData, forecastData, realPR, isDark]);

  return (
    <div className="card p-5 mb-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-theme-secondary font-display">
          Production réelle & prévision 14 jours
        </h3>
        <p className="text-xs text-theme-muted mt-0.5">
          Vert : kWh <strong className="text-theme-secondary">réels</strong> (EMA) · Orange : kWh{' '}
          <strong className="text-theme-secondary">prévus</strong> (ensoleillement Open-Meteo × rendement mesuré sur votre
          passé)
        </p>
      </div>
      <div ref={ref} style={{ width: '100%', height: 380 }} />
    </div>
  );
}
