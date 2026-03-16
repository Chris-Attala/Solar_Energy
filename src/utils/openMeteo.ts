/**
 * Open-Meteo API — archive + forecast.
 * 
 * Projection calibrée sur données réelles :
 * - PR réel = moyenne(production_jour / radiation_estimée_jour) sur tous les jours du CSV
 * - Si pas assez de données (<7 jours), fallback sur PR théorique 0.78
 * - Plus vous importez de données, plus le PR réel est précis
 */
import { OpenMeteoData, MonthlyProjection } from '../types/energy';
import { format, addMonths, getMonth, startOfMonth, endOfMonth, subDays, getDaysInMonth } from 'date-fns';

export const LAT = 43.55;
export const LON = 7.0;
const KWC = 12;
const TILT_FACTOR = 1.12;
const AZIMUTH_FACTOR = 0.976;
const PR_THEORIQUE = 0.78;
const MIN_DAYS_FOR_CALIBRATION = 7; // minimum pour que la calibration soit significative

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Production théorique brute par MJ/m² (sans PR — le PR est appliqué séparément)
 */
function rawProductionPerMJ(mjPerM2: number): number {
  const kwhPerM2 = mjPerM2 / 3.6;
  return kwhPerM2 * TILT_FACTOR * AZIMUTH_FACTOR * KWC;
}

/**
 * Calcule le PR réel à partir des données CSV + données Open-Meteo historiques.
 * PR réel = moyenne de (production_réelle_jour / production_théorique_jour)
 * Retourne null si pas assez de données.
 */
export async function calcRealPR(
  csvData: { date: Date; produced: number }[]
): Promise<{ pr: number; calibratedDays: number }> {
  if (csvData.length < MIN_DAYS_FOR_CALIBRATION) {
    return { pr: PR_THEORIQUE, calibratedDays: csvData.length };
  }

  const minDate = csvData[0].date;
  const maxDate = csvData[csvData.length - 1].date;

  try {
    const historical = await fetchHistoricalIrradiance(minDate, maxDate);
    if (historical.length === 0) return { pr: PR_THEORIQUE, calibratedDays: 0 };

    // Map date → radiation
    const radMap = new Map<string, number>();
    historical.forEach(d => radMap.set(format(d.date, 'yyyy-MM-dd'), d.solarRadiation));

    const ratios: number[] = [];
    csvData.forEach(d => {
      const key = format(d.date, 'yyyy-MM-dd');
      const rad = radMap.get(key);
      if (rad && rad > 2) { // ignore jours quasi sans soleil (< 2 MJ/m²)
        const theoreticalNoPR = rawProductionPerMJ(rad);
        if (theoreticalNoPR > 0.5) {
          ratios.push(d.produced / theoreticalNoPR);
        }
      }
    });

    if (ratios.length < MIN_DAYS_FOR_CALIBRATION) {
      return { pr: PR_THEORIQUE, calibratedDays: ratios.length };
    }

    // Moyenne tronquée : retire les 10% extrêmes pour éviter les outliers
    ratios.sort((a, b) => a - b);
    const trim = Math.floor(ratios.length * 0.1);
    const trimmed = ratios.slice(trim, ratios.length - trim);
    const prReel = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

    // Sanity check : PR réel entre 0.4 et 1.1
    const prFinal = Math.max(0.4, Math.min(1.1, prReel));
    return { pr: prFinal, calibratedDays: ratios.length };
  } catch {
    return { pr: PR_THEORIQUE, calibratedDays: 0 };
  }
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
        expectedProduction: (rawProductionPerMJ(rad)) * PR_THEORIQUE,
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
        expectedProduction: rawProductionPerMJ(rad) * PR_THEORIQUE,
      };
    });
  } catch (err) {
    console.warn('fetchForecastIrradiance failed:', err);
    return [];
  }
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export async function fetchMonthlyProjections(
  electricityPrice: number,
  autoconsRate: number,
  realPR: number  // PR calibré sur données réelles
): Promise<MonthlyProjection[]> {
  const today = new Date();
  const results: MonthlyProjection[] = [];

  for (let i = 0; i < 12; i++) {
    const target   = addMonths(today, i);
    const monthIdx = getMonth(target);
    const refStart = subDays(startOfMonth(target), 365);
    const refEnd   = subDays(endOfMonth(target), 365);

    try {
      // Radiation de l'année passée pour ce mois
      const s = format(refStart, 'yyyy-MM-dd');
      const e = format(refEnd, 'yyyy-MM-dd');
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${s}&end_date=${e}&daily=shortwave_radiation_sum&timezone=Europe%2FParis`;
      const res  = await fetch(url);
      const json = await res.json();

      let totalProd = 0;
      if (json.daily?.time) {
        (json.daily.time as string[]).forEach((_: string, i: number) => {
          const rad = json.daily.shortwave_radiation_sum[i] ?? 0;
          // Utilise le PR réel calibré sur vos données
          totalProd += rawProductionPerMJ(rad) * realPR;
        });
      }

      const selfConsumed = totalProd * autoconsRate;
      const daysInMonth  = getDaysInMonth(target);
      results.push({
        month:      MONTH_NAMES[monthIdx],
        monthIndex: monthIdx,
        production: totalProd,
        savings:    selfConsumed * electricityPrice,
        daysInMonth,
      });
    } catch {
      const daysInMonth = getDaysInMonth(addMonths(today, i));
      results.push({ month: MONTH_NAMES[monthIdx], monthIndex: monthIdx, production: 0, savings: 0, daysInMonth });
    }
  }
  return results;
}
