export interface EnergyData {
  date: Date;
  /** YYYY-MM-DD tel que dans le fichier (évite décalages fuseau vs Open-Meteo) */
  dateKey?: string;
  produced: number;
  consumed: number;
  exported: number;
  imported: number;
  charged: number;
  discharged: number;
}

export interface OpenMeteoData {
  date: Date;
  solarRadiation: number;
  expectedProduction: number;
}

export interface MonthlyProjection {
  month: string;
  monthIndex: number;
  production: number;
  savings: number;
  daysInMonth: number;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface PeriodKPIs {
  totalProduced: number;
  days: number;
  avgDailyProduction: number;
  autoconsumption: number;
  selfSufficiency: number;
  /** kWh autoconsommés sur la période (Σ max(0, produit − export) par jour ≈ total produit − total export agrégé) */
  selfConsumedKwh: number;
  totalSavings: number;
  totalExported: number;
  totalImported: number;
}
