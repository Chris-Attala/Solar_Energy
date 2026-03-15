import { EnergyData, KPIData, Granularity, SeasonalStats } from '../types/energy';
import { parseISO, format, startOfWeek, startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(',', '.').replace(/\s/g, '')) || 0;
}

function parseFlexDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();

  // ISO: 2024-01-15
  const iso = parseISO(s);
  if (!isNaN(iso.getTime())) return iso;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? 2000 + parseInt(mdy[3]) : parseInt(mdy[3]);
    const d = new Date(year, parseInt(mdy[1]) - 1, parseInt(mdy[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  // Excel serial number (e.g. 45123)
  const serial = parseFloat(s);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const d = XLSX.SSF.parse_date_code(serial);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }

  return null;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

export function parseCSVData(csvText: string): EnergyData[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect separator
  const sample = lines[1] || lines[0];
  const sep = sample.includes(';') ? ';' : ',';

  const data: EnergyData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^total/i.test(line)) continue;

    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.length < 7) continue;

    const date = parseFlexDate(vals[0]);
    if (!date) continue;

    data.push({
      date,
      produced:   parseNum(vals[1]),
      consumed:   parseNum(vals[2]),
      exported:   parseNum(vals[3]),
      imported:   parseNum(vals[4]),
      charged:    parseNum(vals[5]),
      discharged: parseNum(vals[6]),
    });
  }
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Excel Parser ─────────────────────────────────────────────────────────────

export function parseExcelData(buffer: ArrayBuffer): EnergyData[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: '',
    dateNF: 'yyyy-mm-dd',
  });

  if (rows.length < 2) return [];

  // Find header row (first row mentioning date/produit/produced)
  let headerRow = 0;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i] as string[];
    if (r.some(c => typeof c === 'string' && /date|produit|produced|production|energie/i.test(c))) {
      headerRow = i;
      break;
    }
  }

  const data: EnergyData[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length < 7) continue;
    if (/^total/i.test(String(row[0] ?? ''))) continue;

    const date = parseFlexDate(row[0]);
    if (!date) continue;

    data.push({
      date,
      produced:   parseNum(row[1]),
      consumed:   parseNum(row[2]),
      exported:   parseNum(row[3]),
      imported:   parseNum(row[4]),
      charged:    parseNum(row[5]),
      discharged: parseNum(row[6]),
    });
  }
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function calculateKPIs(data: EnergyData[], electricityPrice = 0.28): KPIData {
  if (data.length === 0) {
    return { totalProduced: 0, autoconsumption: 0, selfSufficiency: 0, totalSavings: 0, totalExported: 0, totalImported: 0, netBalance: 0, productionChange: 0 };
  }
  const totalProduced   = data.reduce((s, d) => s + d.produced,   0);
  const totalConsumed   = data.reduce((s, d) => s + d.consumed,   0);
  const totalExported   = data.reduce((s, d) => s + d.exported,   0);
  const totalImported   = data.reduce((s, d) => s + d.imported,   0);
  const totalCharged    = data.reduce((s, d) => s + d.charged,    0);
  const totalDischarged = data.reduce((s, d) => s + d.discharged, 0);

  const selfConsumed    = Math.max(0, totalProduced - totalExported);
  const autoconsumption = totalProduced > 0 ? (selfConsumed / totalProduced) * 100 : 0;
  const selfSufficiency = totalConsumed  > 0 ? (selfConsumed / totalConsumed)  * 100 : 0;
  const totalSavings    = selfConsumed * electricityPrice;
  const netBalance      = totalProduced + totalDischarged - totalConsumed - totalCharged;

  const mid  = Math.floor(data.length / 2);
  const prev = data.slice(0, mid).reduce((s, d) => s + d.produced, 0);
  const curr = data.slice(mid).reduce((s, d) => s + d.produced, 0);
  const productionChange = prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return { totalProduced, autoconsumption, selfSufficiency, totalSavings, totalExported, totalImported, netBalance, productionChange };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

export function aggregateByGranularity(data: EnergyData[], granularity: Granularity): EnergyData[] {
  if (granularity === 'daily') return data;
  const grouped = new Map<string, EnergyData>();
  data.forEach(entry => {
    const key = granularity === 'weekly'
      ? format(startOfWeek(entry.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(entry.date), 'yyyy-MM-dd');
    const ex = grouped.get(key);
    if (ex) {
      ex.produced   += entry.produced;
      ex.consumed   += entry.consumed;
      ex.exported   += entry.exported;
      ex.imported   += entry.imported;
      ex.charged    += entry.charged;
      ex.discharged += entry.discharged;
    } else {
      grouped.set(key, { ...entry, date: parseISO(key) });
    }
  });
  return Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export function filterBySeason(data: EnergyData[], season: string): EnergyData[] {
  if (season === 'all') return data;
  return data.filter(entry => {
    const m = entry.date.getMonth();
    switch (season) {
      case 'spring': return m >= 2 && m <= 4;
      case 'summer': return m >= 5 && m <= 7;
      case 'autumn': return m >= 8 && m <= 10;
      case 'winter': return m === 11 || m === 0 || m === 1;
      default: return true;
    }
  });
}

export function filterByDateRange(data: EnergyData[], start: Date | null, end: Date | null): EnergyData[] {
  return data.filter(d => {
    const t = d.date.getTime();
    return (!start || t >= start.getTime()) && (!end || t <= end.getTime());
  });
}

// ─── Seasonal stats ───────────────────────────────────────────────────────────

export function calculateSeasonalStats(data: EnergyData[], electricityPrice = 0.28): SeasonalStats[] {
  const config = [
    { season: 'spring', label: 'Printemps', emoji: '🌸', color: '#22c55e' },
    { season: 'summer', label: 'Été',       emoji: '☀️', color: '#f59e0b' },
    { season: 'autumn', label: 'Automne',   emoji: '🍂', color: '#f97316' },
    { season: 'winter', label: 'Hiver',     emoji: '❄️', color: '#38bdf8' },
  ];
  return config.map(({ season, label, emoji, color }) => {
    const sd   = filterBySeason(data, season);
    const kpis = calculateKPIs(sd, electricityPrice);
    return {
      season, label, emoji, color,
      days: sd.length,
      avgDailyProduction: sd.length > 0 ? kpis.totalProduced / sd.length : 0,
      totalProduction:    kpis.totalProduced,
      avgAutoconsumption: kpis.autoconsumption,
      avgSelfSufficiency: kpis.selfSufficiency,
      savings:            kpis.totalSavings,
    };
  });
}
