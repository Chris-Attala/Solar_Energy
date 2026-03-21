/**
 * Open-Meteo API — archive + forecast.
 * 
 * Projection calibrée sur données réelles :
 * - « PR » (Performance Ratio) = rendement : production EMA / production théorique depuis l’irradiance (sans ce facteur).
 * - PR mesuré = moyenne de ce rapport sur les jours du CSV (voir calcRealPR). Si moins de 7 jours utiles → PR théorique 0,78.
 */
import { OpenMeteoData, MonthlyProjection } from '../types/energy';
import { addMonths, getMonth, startOfMonth, endOfMonth, subYears, getDaysInMonth } from 'date-fns';
import { dateToParisYmd } from './parisDate';

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
export function rawProductionPerMJ(mjPerM2: number): number {
  const kwhPerM2 = mjPerM2 / 3.6;
  return kwhPerM2 * TILT_FACTOR * AZIMUTH_FACTOR * KWC;
}

/** kWh/jour = modèle physique (soleil) × rendement mesuré (PR) sur votre passé */
export function calibratedDailyProduction(mjPerM2: number, pr: number): number {
  if (mjPerM2 <= 0) return 0;
  return rawProductionPerMJ(mjPerM2) * pr;
}

/**
 * Rendement mesuré (Performance Ratio) à partir du CSV + irradiance archive.
 * = moyenne tronquée de (production EMA du jour / production théorique même jour depuis le soleil).
 */
export async function calcRealPR(
  csvData: { date: Date; produced: number; dateKey?: string }[]
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
    historical.forEach(d => radMap.set(dateToParisYmd(d.date), d.solarRadiation));

    const ratios: number[] = [];
    csvData.forEach(d => {
      const key = d.dateKey ?? dateToParisYmd(d.date);
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
  const s = dateToParisYmd(start);
  const e = dateToParisYmd(end);
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

/** Max 16 jours sur l’API gratuite ; pour un graphique jusqu’à J+14 il faut > 14 (sinon dernier jour sans donnée). */
export async function fetchForecastIrradiance(days = 16): Promise<OpenMeteoData[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=shortwave_radiation_sum&timezone=Europe%2FParis&forecast_days=${Math.min(days, 16)}`;
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

/** Nombre d’années archive à moyenner pour chaque mois projeté (même mois civil : N−1, N−2, N−3…). */
export const MONTHLY_PROJECTION_ARCHIVE_YEARS = 3;

/** Somme kWh sur une plage archive (un mois) ; null si échec API ou pas de données. */
async function fetchArchiveRangeProductionKwh(
  refStart: Date,
  refEnd: Date,
  realPR: number
): Promise<number | null> {
  const s = dateToParisYmd(refStart);
  const e = dateToParisYmd(refEnd);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${s}&end_date=${e}&daily=shortwave_radiation_sum&timezone=Europe%2FParis`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const times = json.daily.time as string[];
    const rads = json.daily.shortwave_radiation_sum as number[] | undefined;
    if (!times.length) return null;
    let total = 0;
    for (let idx = 0; idx < times.length; idx++) {
      const rad = rads?.[idx] ?? 0;
      total += rawProductionPerMJ(rad) * realPR;
    }
    return total;
  } catch {
    return null;
  }
}

/**
 * Projection mois par mois : pour chaque mois futur M, on prend les **mêmes mois civils**
 * sur les **N dernières années** (voir `MONTHLY_PROJECTION_ARCHIVE_YEARS`) dans l’archive Open-Meteo,
 * on calcule la production mensuelle (Σ rawProductionPerMJ × realPR) pour chaque année, puis
 * **moyenne arithmétique** des totaux mensuels.
 */
export async function fetchMonthlyProjections(
  electricityPrice: number,
  autoconsRate: number,
  realPR: number  // PR calibré sur données réelles
): Promise<MonthlyProjection[]> {
  const today = new Date();
  const results: MonthlyProjection[] = [];

  for (let i = 0; i < 12; i++) {
    const target = addMonths(today, i);
    const monthIdx = getMonth(target);
    const mStart = startOfMonth(target);
    const mEnd = endOfMonth(target);
    const daysInMonth = getDaysInMonth(target);

    const yearTotals = await Promise.all(
      Array.from({ length: MONTHLY_PROJECTION_ARCHIVE_YEARS }, (_, j) => {
        const yOff = j + 1;
        const refStart = subYears(mStart, yOff);
        const refEnd = subYears(mEnd, yOff);
        return fetchArchiveRangeProductionKwh(refStart, refEnd, realPR);
      })
    );

    const valid = yearTotals.filter((v): v is number => v != null && Number.isFinite(v));
    const totalProd = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;

    const selfConsumed = totalProd * autoconsRate;
    results.push({
      month: MONTH_NAMES[monthIdx],
      monthIndex: monthIdx,
      production: totalProd,
      savings: selfConsumed * electricityPrice,
      daysInMonth,
    });
  }
  return results;
}
