import { useState, useEffect, useMemo } from 'react';
import { EnergyData, MonthlyProjection, OpenMeteoData, Granularity } from '../types/energy';
import {
  fetchHistoricalIrradiance,
  fetchForecastIrradiance,
  fetchMonthlyProjections,
  calcRealPR,
} from '../utils/openMeteo';
import {
  getAutoconsumptionRate,
  aggregateByGranularity,
  computePeriodKPIs,
} from '../utils/dataProcessing';
import { format } from 'date-fns';
import { KPICards } from './KPICards';
import { Chart12Months } from './Chart12Months';

import { ChartProductionOverview } from './ChartProductionOverview';
import { ChartEnergyBreakdown } from './ChartEnergyBreakdown';
import { ChartSeasonal } from './ChartSeasonal';
import { ChartBilanEnergie } from './ChartBilanEnergie';

const EXPORT_PRICE = 0.04;

interface Props {
  data: EnergyData[];
  electricityPrice: number;
}

export function Dashboard({ data, electricityPrice }: Props) {
  const [granularity, setGranularity]   = useState<Granularity>('daily');
  const [expectedData, setExpectedData] = useState<OpenMeteoData[]>([]);
  const [forecastData, setForecastData] = useState<OpenMeteoData[]>([]);
  const [monthlyProj, setMonthlyProj]   = useState<MonthlyProjection[]>([]);
  const [realPR, setRealPR]             = useState<number>(0.78);
  const [calibDays, setCalibDays]       = useState<number>(0);
  const [loading, setLoading]           = useState(true);

  const autoconsRate = useMemo(() => getAutoconsumptionRate(data), [data]);
  const filteredData = useMemo(() => aggregateByGranularity(data, granularity), [data, granularity]);
  const periodKPIs   = useMemo(() => computePeriodKPIs(data, electricityPrice), [data, electricityPrice]);



  const avgDailyConsumption = useMemo(
    () => (data.length > 0 ? data.reduce((s, d) => s + d.consumed, 0) / data.length : 0),
    [data]
  );

  const importCost     = periodKPIs.totalImported * electricityPrice;
  const exportRevenue  = periodKPIs.totalExported * EXPORT_PRICE;
  const netCostBalance = periodKPIs.totalSavings + exportRevenue - importCost;

  // Moyenne mensuelle pondérée : bilan/jour × 30.44 jours/mois
  const monthlyNetBalance = useMemo(() => {
    if (periodKPIs.days === 0) return 0;
    return (netCostBalance / periodKPIs.days) * 30.44;
  }, [netCostBalance, periodKPIs.days]);

  const bestDay = useMemo(() => {
    if (data.length === 0) return { kwh: 0, date: '', consumed: 0, exported: 0, imported: 0, selfConsumed: 0, savings: 0, selfSufficiency: 0 };
    const best = data.reduce((a, b) => (b.produced > a.produced ? b : a), data[0]);
    const selfConsumed = Math.max(0, best.produced - best.exported);
    const selfSufficiency = best.consumed > 0 ? (selfConsumed / best.consumed) * 100 : 0;
    return {
      kwh: best.produced,
      date: format(best.date, 'dd/MM/yyyy'),
      consumed: best.consumed,
      exported: best.exported,
      imported: best.imported,
      selfConsumed,
      savings: selfConsumed * electricityPrice,
      selfSufficiency,
    };
  }, [data, electricityPrice]);

  useEffect(() => {
    if (data.length === 0) return;
    setLoading(true);

    const minDate = data[0].date;
    const maxDate = data[data.length - 1].date;

    // 1. Calibrer le PR réel sur les données CSV
    calcRealPR(data).then(({ pr, calibratedDays }) => {
      setRealPR(pr);
      setCalibDays(calibratedDays);

      // 2. Charger toutes les données avec le PR calibré
      Promise.all([
        fetchHistoricalIrradiance(minDate, maxDate),
        fetchForecastIrradiance(14),
        fetchMonthlyProjections(electricityPrice, autoconsRate, pr),
      ])
        .then(([hist, fore, monthly]) => {
          setExpectedData(hist);
          setForecastData(fore);
          setMonthlyProj(monthly);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [data, electricityPrice, autoconsRate]);

  const annualSavings = monthlyProj.reduce((s, m) => s + m.savings, 0);

  if (loading && monthlyProj.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
        Chargement des données Open-Meteo…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bandeau calibration */}
      <div className={`mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs ${
        calibDays >= 7
          ? 'border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e]'
          : 'border-amber-700/30 bg-amber-900/10 text-amber-400'
      }`}>
        <span className="font-semibold">
          {calibDays >= 7
            ? `✓ Projections affinées sur ${calibDays} jours de vos données réelles`
            : `⚠ Peu de données disponibles — importez plus d'historique EMA pour des projections plus précises`
          }
        </span>
      </div>

      {/* Note discrète jours suspects */}
      {(() => {
        if (expectedData.length === 0) return null;
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const expectedMap = new Map(expectedData.map(d => [fmt(d.date), d.expectedProduction]));
        const suspiciousDays = data.filter(d => {
          const key = fmt(d.date);
          const expected = expectedMap.get(key);
          return expected && expected > 5 && d.produced < expected * 0.70;
        });
        if (suspiciousDays.length === 0) return null;
        return (
          <p className="text-[11px] text-slate-600 mb-3 px-1">
            ⚠ {suspiciousDays.length} jour{suspiciousDays.length > 1 ? 's' : ''} avec production faible vs ensoleillement Open-Meteo — possible déconnexion EMA
          </p>
        );
      })()}

      <KPICards
        avgDailyProduction={periodKPIs.avgDailyProduction}
        annualSavings={annualSavings}
        monthlyNetBalance={monthlyNetBalance}
        selfSufficiencyPerDay={periodKPIs.selfSufficiency}
        totalExported={periodKPIs.totalExported}
        totalImported={periodKPIs.totalImported}
        periodSavings={periodKPIs.totalSavings}
        importCost={importCost}
        netCostBalance={netCostBalance}
        periodDays={periodKPIs.days}
        bestDayKwh={bestDay.kwh}
        bestDayDate={bestDay.date}
        bestDayConsumed={bestDay.consumed}
        bestDayExported={bestDay.exported}
        bestDayImported={bestDay.imported}
        bestDaySelfConsumed={bestDay.selfConsumed}
        bestDaySavings={bestDay.savings}
        bestDaySelfSufficiency={bestDay.selfSufficiency}
      />

      <Chart12Months
        monthlyProjections={monthlyProj}
        avgDailyConsumption={avgDailyConsumption}
        
        electricityPrice={electricityPrice}
      />

      <ChartProductionOverview
        data={data}
        expectedData={expectedData}
        forecastData={forecastData}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBilanEnergie data={data} electricityPrice={electricityPrice} />
        <ChartEnergyBreakdown data={data} />
      </div>

      <div className="grid grid-cols-1">
        <ChartSeasonal data={data} electricityPrice={electricityPrice} />
      </div>
    </div>
  );
}