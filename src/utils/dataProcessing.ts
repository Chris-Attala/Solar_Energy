/**
 * Parsing CSV/Excel EMA — colonnes : Date, Produced (kWh), Consumed, Exported, Imported, Charged, Discharged
 * Dates en local : new Date(y, m-1, d)
 */
import { EnergyData, Granularity, PeriodKPIs } from '../types/energy';
import { format, startOfWeek, startOfMonth, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { dateToParisYmd } from './parisDate';

function parseNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(',', '.').replace(/\s/g, '')) || 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export type ParsedFlexDate = { date: Date; dateKey: string };

/** Date + clé YYYY-MM-DD issue des entiers du fichier (pas d’interprétation fuseau). */
function parseFlexDate(raw: unknown): ParsedFlexDate | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    const d = raw.getDate();
    return { date: raw, dateKey: `${y}-${pad2(m)}-${pad2(d)}` };
  }
  const s = String(raw).trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const mo = parseInt(iso[2], 10);
    const da = parseInt(iso[3], 10);
    const date = new Date(y, mo - 1, da);
    return isNaN(date.getTime()) ? null : { date, dateKey: `${y}-${pad2(mo)}-${pad2(da)}` };
  }

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const da = parseInt(dmy[1], 10);
    const mo = parseInt(dmy[2], 10);
    const y = parseInt(dmy[3], 10);
    const date = new Date(y, mo - 1, da);
    return isNaN(date.getTime()) ? null : { date, dateKey: `${y}-${pad2(mo)}-${pad2(da)}` };
  }

  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? 2000 + parseInt(mdy[3], 10) : parseInt(mdy[3], 10);
    const mo = parseInt(mdy[1], 10);
    const da = parseInt(mdy[2], 10);
    const date = new Date(year, mo - 1, da);
    return isNaN(date.getTime()) ? null : { date, dateKey: `${year}-${pad2(mo)}-${pad2(da)}` };
  }

  const serial = parseFloat(s);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const d = XLSX.SSF.parse_date_code(serial);
    if (d) {
      const date = new Date(d.y, d.m - 1, d.d);
      return { date, dateKey: `${d.y}-${pad2(d.m)}-${pad2(d.d)}` };
    }
  }
  return null;
}

export function parseCSVData(csvText: string): EnergyData[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = (lines[1] || lines[0]).includes(';') ? ';' : ',';
  const data: EnergyData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^total/i.test(line)) continue;
    const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
    if (vals.length < 7) continue;
    const pd = parseFlexDate(vals[0]);
    if (!pd) continue;
    data.push({
      date: pd.date,
      dateKey: pd.dateKey,
      produced: parseNum(vals[1]),
      consumed: parseNum(vals[2]),
      exported: parseNum(vals[3]),
      imported: parseNum(vals[4]),
      charged: parseNum(vals[5]),
      discharged: parseNum(vals[6]),
    });
  }
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function parseExcelData(buffer: ArrayBuffer): EnergyData[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (rows.length < 2) return [];

  let headerRow = 0;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i] as string[];
    if (r.some((c) => typeof c === 'string' && /date|produit|produced|production|energie/i.test(c))) {
      headerRow = i;
      break;
    }
  }

  const data: EnergyData[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length < 7 || /^total/i.test(String(row[0] ?? ''))) continue;
    const pd = parseFlexDate(row[0]);
    if (!pd) continue;
    data.push({
      date: pd.date,
      dateKey: pd.dateKey,
      produced: parseNum(row[1]),
      consumed: parseNum(row[2]),
      exported: parseNum(row[3]),
      imported: parseNum(row[4]),
      charged: parseNum(row[5]),
      discharged: parseNum(row[6]),
    });
  }
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Taux d'autoconsommation réel (production - export) / production */
export function getAutoconsumptionRate(data: EnergyData[]): number {
  if (data.length === 0) return 0.7;
  const totalProduced = data.reduce((s, d) => s + d.produced, 0);
  const totalExported = data.reduce((s, d) => s + d.exported, 0);
  const selfConsumed = Math.max(0, totalProduced - totalExported);
  return totalProduced > 0 ? Math.min(0.95, Math.max(0.3, selfConsumed / totalProduced)) : 0.7;
}

/** Agrégation par granularité (jour / semaine / mois) */
export function aggregateByGranularity(data: EnergyData[], granularity: Granularity): EnergyData[] {
  if (granularity === 'daily') return data;
  const grouped = new Map<string, EnergyData>();
  data.forEach((entry) => {
    const key =
      granularity === 'weekly'
        ? format(startOfWeek(entry.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        : format(startOfMonth(entry.date), 'yyyy-MM-dd');
    const ex = grouped.get(key);
    if (ex) {
      ex.produced += entry.produced;
      ex.consumed += entry.consumed;
      ex.exported += entry.exported;
      ex.imported += entry.imported;
      ex.charged += entry.charged;
      ex.discharged += entry.discharged;
    } else {
      const [y, m, d] = key.split('-').map(Number);
      grouped.set(key, { ...entry, date: new Date(y, m - 1, d) });
    }
  });
  return Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** KPIs sur la période (pour les cartes) */
export function computePeriodKPIs(data: EnergyData[], electricityPrice: number): PeriodKPIs {
  if (data.length === 0) {
    return {
      totalProduced: 0,
      days: 0,
      avgDailyProduction: 0,
      autoconsumption: 0,
      selfSufficiency: 0,
      selfConsumedKwh: 0,
      totalSavings: 0,
      totalExported: 0,
      totalImported: 0,
    };
  }
  const totalProduced = data.reduce((s, d) => s + d.produced, 0);
  const totalConsumed = data.reduce((s, d) => s + d.consumed, 0);
  const totalExported = data.reduce((s, d) => s + d.exported, 0);
  const totalImported = data.reduce((s, d) => s + d.imported, 0);
  const selfConsumed = Math.max(0, totalProduced - totalExported);
  const autoconsumption = totalProduced > 0 ? (selfConsumed / totalProduced) * 100 : 0;
  const selfSufficiency = totalConsumed > 0 ? (selfConsumed / totalConsumed) * 100 : 0;
  const totalSavings = selfConsumed * electricityPrice;
  return {
    totalProduced,
    days: data.length,
    avgDailyProduction: totalProduced / data.length,
    selfConsumedKwh: selfConsumed,
    autoconsumption,
    selfSufficiency,
    totalSavings,
    totalExported,
    totalImported,
  };
}

export type SeasonFilter = 'all' | 'winter' | 'spring' | 'summer' | 'autumn';

function getAstronomicalSeason(date: Date): Exclude<SeasonFilter, 'all'> {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // Bornes astronomiques (hémisphère nord) :
  // printemps 20/03, été 21/06, automne 22/09, hiver 21/12.
  if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day <= 20)) {
    return 'spring';
  }
  if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day <= 21)) {
    return 'summer';
  }
  if ((month === 8 && day >= 22) || month === 9 || month === 10 || (month === 11 && day <= 20)) {
    return 'autumn';
  }
  return 'winter';
}

export function filterBySeason(data: EnergyData[], season: SeasonFilter): EnergyData[] {
  if (season === 'all') return data;
  return data.filter((d) => getAstronomicalSeason(d.date) === season);
}

/** Données par saison pour comparaison (production, économies, coût import) */
export function getSeasonalBreakdown(
  data: EnergyData[],
  electricityPrice: number
): { season: string; label: string; production: number; savings: number; importCost: number; days: number; totalDays: number; isEstimate: boolean; color: string }[] {
  // Nombre de jours théoriques par saison (astronomique, approximatif)
  const SEASON_TOTAL_DAYS: Record<string, number> = {
    winter: 89, spring: 93, summer: 93, autumn: 90,
  };
  const config = [
    { season: 'winter', label: 'Hiver', color: '#38bdf8' },
    { season: 'spring', label: 'Printemps', color: '#22c55e' },
    { season: 'summer', label: 'Été', color: '#f59e0b' },
    { season: 'autumn', label: 'Automne', color: '#f97316' },
  ];
  return config.map(({ season, label, color }) => {
    const subset = data.filter((d) => getAstronomicalSeason(d.date) === season);
    const totalDays = SEASON_TOTAL_DAYS[season];

    // Pas de données pour cette saison — retourner zéro
    if (subset.length === 0) {
      return { season, label, production: 0, savings: 0, importCost: 0, days: 0, totalDays, isEstimate: false, color };
    }

    const rawProduction = subset.reduce((s, d) => s + d.produced, 0);
    const rawExported   = subset.reduce((s, d) => s + d.exported, 0);
    const rawImported   = subset.reduce((s, d) => s + d.imported, 0);

    // Extrapoler si données partielles (moins de 80% des jours de la saison)
    const isEstimate = subset.length < totalDays * 0.8;
    const factor = isEstimate ? totalDays / subset.length : 1;

    const production  = rawProduction * factor;
    const exported    = rawExported   * factor;
    const imported    = rawImported   * factor;
    const selfConsumed = Math.max(0, production - exported);
    const savings     = selfConsumed * electricityPrice;
    const importCost  = imported * electricityPrice;

    return { season, label, production, savings, importCost, days: subset.length, totalDays, isEstimate, color };
  });
}

/** Fenêtre pour le graphique répartition production (autoconso / export). */
export type RepartitionWindowMode = 'days' | 'weeks' | 'months';

const REPARTITION_BUCKET_COUNT = 4;

export interface RepartitionBucket {
  label: string;
  selfConsumed: number;
  exported: number;
}

function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Somme produced/exported par jour civil (clé Paris / dateKey fichier). */
function dailyProducedExportedMap(data: EnergyData[]): Map<string, { produced: number; exported: number }> {
  const m = new Map<string, { produced: number; exported: number }>();
  for (const row of data) {
    const k = row.dateKey ?? dateToParisYmd(row.date);
    const cur = m.get(k) ?? { produced: 0, exported: 0 };
    cur.produced += row.produced;
    cur.exported += row.exported;
    m.set(k, cur);
  }
  return m;
}

/**
 * Dernières tranches (4 jours, 4 semaines civiles lun–dim, ou 4 mois civils) : kWh autoconsommés vs exportés.
 * Semaines / mois : agrégation des jours présents dans les données (pas d’imputation des jours manquants).
 */
export function buildProductionRepartitionBuckets(
  data: EnergyData[],
  mode: RepartitionWindowMode
): RepartitionBucket[] {
  if (data.length === 0) return [];
  const daily = dailyProducedExportedMap(data);
  const sortedDays = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (mode === 'days') {
    return sortedDays.slice(-REPARTITION_BUCKET_COUNT).map(([ymd, v]) => ({
      label: format(ymdToLocalDate(ymd), 'd MMM', { locale: fr }),
      selfConsumed: Math.max(0, v.produced - v.exported),
      exported: v.exported,
    }));
  }

  if (mode === 'weeks') {
    const weekMap = new Map<string, { produced: number; exported: number }>();
    for (const [ymd, v] of sortedDays) {
      const dt = ymdToLocalDate(ymd);
      const wStart = startOfWeek(dt, { weekStartsOn: 1 });
      const wk = format(wStart, 'yyyy-MM-dd');
      const cur = weekMap.get(wk) ?? { produced: 0, exported: 0 };
      cur.produced += v.produced;
      cur.exported += v.exported;
      weekMap.set(wk, cur);
    }
    const sortedWk = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sortedWk.slice(-REPARTITION_BUCKET_COUNT).map(([wStartStr, v]) => {
      const start = ymdToLocalDate(wStartStr);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return {
        label: `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })}`,
        selfConsumed: Math.max(0, v.produced - v.exported),
        exported: v.exported,
      };
    });
  }

  const monthMap = new Map<string, { produced: number; exported: number }>();
  for (const [ymd, v] of sortedDays) {
    const mk = ymd.slice(0, 7);
    const cur = monthMap.get(mk) ?? { produced: 0, exported: 0 };
    cur.produced += v.produced;
    cur.exported += v.exported;
    monthMap.set(mk, cur);
  }
  const sortedM = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  return sortedM.slice(-REPARTITION_BUCKET_COUNT).map(([ym, v]) => {
    const [y, mo] = ym.split('-').map(Number);
    const start = new Date(y, mo - 1, 1);
    return {
      label: format(start, 'MMM yyyy', { locale: fr }),
      selfConsumed: Math.max(0, v.produced - v.exported),
      exported: v.exported,
    };
  });
}
