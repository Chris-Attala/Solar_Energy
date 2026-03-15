import { OpenMeteoData, MonthlyProjection } from '../types/energy';
import { parseISO, format, subDays, addMonths, startOfMonth, endOfMonth, getMonth } from 'date-fns';

export const LAT  = 43.55;
export const LON  = 7.0;
export const KWC  = 12;
export const TILT = 30;
export const AZ   = 210;
export const PR   = 0.78;

// Climatological monthly correction — Côte d'Azur
const MONTHLY_FACTOR = [0.42,0.54,0.72,0.88,1.05,1.22,1.30,1.18,0.96,0.74,0.50,0.38];

export function expectedFromRadiation(mjm2: number): number {
  const kwhm2       = mjm2 / 3.6;
  const tiltBonus   = 1 + Math.cos((TILT * Math.PI) / 180) * 0.12;
  const azPenalty   = 1 - (Math.abs(AZ - 180) / 180) * 0.08;
  return Math.max(0, kwhm2 * tiltBonus * azPenalty * KWC * PR);
}

export async function fetchHistoricalIrradiance(start: Date, end: Date): Promise<OpenMeteoData[]> {
  const s   = format(start, 'yyyy-MM-dd');
  const e   = format(end,   'yyyy-MM-dd');
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${s}&end_date=${e}&daily=shortwave_radiation_sum&timezone=Europe%2FParis`;
  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.daily?.time) return [];
    return (json.daily.time as string[]).map((dt: string, i: number) => ({
      date:               parseISO(dt),
      solarRadiation:     json.daily.shortwave_radiation_sum[i] ?? 0,
      expectedProduction: expectedFromRadiation(json.daily.shortwave_radiation_sum[i] ?? 0),
    }));
  } catch (err) {
    console.warn('fetchHistoricalIrradiance failed:', err);
    return [];
  }
}

export async function fetchForecastIrradiance(days = 14): Promise<OpenMeteoData[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=shortwave_radiation_sum&timezone=Europe%2FParis&forecast_days=${days}`;
  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.daily?.time) return [];
    return (json.daily.time as string[]).map((dt: string, i: number) => ({
      date:               parseISO(dt),
      solarRadiation:     json.daily.shortwave_radiation_sum[i] ?? 0,
      expectedProduction: expectedFromRadiation(json.daily.shortwave_radiation_sum[i] ?? 0),
    }));
  } catch (err) {
    console.warn('fetchForecastIrradiance failed:', err);
    return [];
  }
}

export function calcPerformanceRatio(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.min(150, (actual / expected) * 100);
}

/**
 * Monthly projections:
 * - For each of the next 12 months, fetch the SAME month last year from Open-Meteo archive
 * - Scale production using the real autoconsumption rate computed from the user's CSV data
 */
export async function calcMonthlyProjections(
  electricityPrice = 0.28,
  autoconsRate     = 0.70,
): Promise<MonthlyProjection[]> {
  const today  = new Date();
  const names  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const results: MonthlyProjection[] = [];

  for (let i = 0; i < 12; i++) {
    const target   = addMonths(today, i);
    const monthIdx = getMonth(target);
    const refStart = subDays(startOfMonth(target), 365);
    const refEnd   = subDays(endOfMonth(target),   365);

    try {
      const hist      = await fetchHistoricalIrradiance(refStart, refEnd);
      let totalProd   = hist.reduce((s, d) => s + d.expectedProduction, 0);

      // Fallback to climatological if API returned nothing
      if (totalProd <= 0) {
        const days  = endOfMonth(target).getDate();
        totalProd   = MONTHLY_FACTOR[monthIdx] * days * KWC * PR * 3.5; // ~3.5 kWh/kWp avg daily
      }

      const selfConsumed = totalProd * autoconsRate;
      results.push({
        month:       names[monthIdx],
        monthIndex:  monthIdx,
        production:  totalProd,
        savings:     selfConsumed * electricityPrice,
        selfConsumed,
      });
    } catch {
      results.push({ month: names[monthIdx], monthIndex: monthIdx, production: 0, savings: 0, selfConsumed: 0 });
    }
  }
  return results;
}
