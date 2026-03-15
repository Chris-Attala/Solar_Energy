export interface EnergyData {
  date: Date;
  produced: number;
  consumed: number;
  exported: number;
  imported: number;
  charged: number;
  discharged: number;
}

export interface KPIData {
  totalProduced: number;
  autoconsumption: number;
  selfSufficiency: number;
  totalSavings: number;
  totalExported: number;
  totalImported: number;
  netBalance: number;
  productionChange: number;
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
  selfConsumed: number;
}

export interface SeasonalStats {
  season: string;
  label: string;
  emoji: string;
  avgDailyProduction: number;
  totalProduction: number;
  avgAutoconsumption: number;
  avgSelfSufficiency: number;
  savings: number;
  days: number;
  color: string;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type Season = 'all' | 'spring' | 'summer' | 'autumn' | 'winter';
