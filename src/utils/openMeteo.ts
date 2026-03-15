/**
 * Open-Meteo API — archive + forecast.
 * Production: radiation_kWh_m2 * 1.12 * 0.976 * 12 * 0.78
 * (tilt 1.12, azimuth 0.976, 12 kWc, PR 0.78)
 */
import { OpenMeteoData, MonthlyProjection } from '../types/energy';
import { format, addMonths, getMonth, startOfMonth, endOfMonth, subDays, getDaysInMonth } from 'date-fns';

export const LAT = 43.55;
export const LON = 7.0;
const KWC = 12;
const TILT_FACTOR = 1.12;
const AZIMUTH_FACTOR = 0.976;
const PR = 0.78;

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function expectedFromRadiationMJ(mjPerM2: number): number {
  const kwhPerM2 = mjPerM2 / 3.6;
  return kwhPerM2 * TILT_FACTOR * AZIMUTH_FACTOR * KWC * PR;
}

export async function fetchHistoricalIrradiance(start: Date, end: Date): Promise<OpenMeteoData[]> {
  const s = format(start, 'yyyy-MM-dd');
  const e = format(end, 'yyyy-MM-dd');
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${s}&end_date=${e}&daily=shortwave_radiation_sum&timezone=Europe%2FParis`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.daily?.time) return [];
    return (json.daily.time as string[]).map((dt: string, i: number) => {
      const rad = json.daily.shortwave_radiation_sum[i] ?? 0;
      return {
        date: parseLocalDate(dt),
        solarRadiation: rad,
        expectedProduction: expectedFromRadiationMJ(rad),
      };
    });
  } catch (err) {
    console.warn('fetchHistoricalIrradiance failed:', err);
    return [];
  }
}

export async function fetchForecastIrradiance(days = 14): Promise<OpenMeteoData[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=shortwave_radiation_sum&timezone=Europe%2FParis&forecast_days=${days}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.daily?.time) return [];
    return (json.daily.time as string[]).map((dt: string, i: number) => {
      const rad = json.daily.shortwave_radiation_sum[i] ?? 0;
      return {
        date: parseLocalDate(dt),
        solarRadiation: rad,
        expectedProduction: expectedFromRadiationMJ(rad),
      };
    });
  } catch (err) {
    console.warn('fetchForecastIrradiance failed:', err);
    return [];
  }
}

export function calcPerformanceRatio(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.min(150, (actual / expected) * 100);
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export async function fetchMonthlyProjections(
  electricityPrice: number,
  autoconsRate: number
): Promise<MonthlyProjection[]> {
  const today = new Date();
  const results: MonthlyProjection[] = [];

  for (let i = 0; i < 12; i++) {
    const target = addMonths(today, i);
    const monthIdx = getMonth(target);
    const refStart = subDays(startOfMonth(target), 365);
    const refEnd = subDays(endOfMonth(target), 365);

    try {
      const hist = await fetchHistoricalIrradiance(refStart, refEnd);
      const totalProd = hist.reduce((s, d) => s + d.expectedProduction, 0);
      const selfConsumed = totalProd * autoconsRate;
      const daysInMonth = getDaysInMonth(target);
      results.push({
        month: MONTH_NAMES[monthIdx],
        monthIndex: monthIdx,
        production: totalProd,
        savings: selfConsumed * electricityPrice,
        daysInMonth,
      });
    } catch {
      const daysInMonth = getDaysInMonth(addMonths(today, i));
      results.push({ month: MONTH_NAMES[monthIdx], monthIndex: monthIdx, production: 0, savings: 0, daysInMonth });
    }
  }
  return results;
}
