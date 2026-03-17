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

  // Autosuffisance moyenne par jour
  const selfSufficiencyPerDay = useMemo(() => {
    const days = data.filter(d => d.consumed > 0);
    if (days.length === 0) return 0;
    const sum = days.reduce((s, d) => {
      const selfConsumed = Math.max(0, d.produced - d.exported);
      return s + (selfConsumed / d.consumed) * 100;
    }, 0);
    return Math.min(100, sum / days.length);
  }, [data]);

  const avgDailyConsumption = useMemo(
    () => (data.length > 0 ? data.reduce((s, d) => s + d.consumed, 0) / data.length : 0),
    [data]
  );

  const importCost     = periodKPIs.totalImported * electricityPrice;
  const exportRevenue  = periodKPIs.totalExported * EXPORT_PRICE;
  const netCostBalance = periodKPIs.totalSavings + exportRevenue - importCost;

  const numMonths = useMemo(() => {
    if (data.length === 0) return 1;
    const start = data[0].date;
    const end   = data[data.length - 1].date;
    return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
  }, [data]);

  const monthlyNetBalance = netCostBalance / numMonths;

  const bestDay = useMemo(() => {
    if (data.length === 0) return { kwh: 0, date: '' };
    const best = data.reduce((a, b) => (b.produced > a.produced ? b : a), data[0]);
    return { kwh: best.produced, date: format(best.date, 'dd/MM/yyyy') };
  }, [data]);

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
    <div className="space-y-0">
      {/* Bandeau calibration */}
      <div className={`mb-6 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs ${
        calibDays >= 7
          ? 'border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e]'
          : 'border-amber-700/30 bg-amber-900/10 text-amber-400'
      }`}>
        <span className="font-semibold">
          {calibDays >= 7
            ? `✓ Projections calibrées sur ${calibDays} jours réels · PR réel ${(realPR * 100).toFixed(0)}%`
            : `⚠ Seulement ${calibDays} jour${calibDays > 1 ? 's' : ''} de données — projections théoriques (PR ${(realPR * 100).toFixed(0)}%). Importez plus de données pour calibrer.`
          }
        </span>
      </div>

      <KPICards
        avgDailyProduction={periodKPIs.avgDailyProduction}
        annualSavings={annualSavings}
        monthlyNetBalance={monthlyNetBalance}
        selfSufficiencyPerDay={selfSufficiencyPerDay}
        totalExported={periodKPIs.totalExported}
        totalImported={periodKPIs.totalImported}
        periodSavings={periodKPIs.totalSavings}
        importCost={importCost}
        netCostBalance={netCostBalance}
        bestDayKwh={bestDay.kwh}
        bestDayDate={bestDay.date}
      />

      <Chart12Months
        monthlyProjections={monthlyProj}
        avgDailyConsumption={avgDailyConsumption}
        
        electricityPrice={electricityPrice}
      />

      <ChartProductionOverview
        data={filteredData}
        expectedData={expectedData}
        forecastData={forecastData}
        granularity={granularity}
        onGranularity={setGranularity}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartBilanEnergie data={data} electricityPrice={electricityPrice} />
        <ChartEnergyBreakdown data={data} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ChartSeasonal data={data} electricityPrice={electricityPrice} />
      </div>
    </div>
  );
}
