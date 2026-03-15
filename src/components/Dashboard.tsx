import { useState, useEffect, useMemo } from 'react';
import { EnergyData, MonthlyProjection, OpenMeteoData, Granularity } from '../types/energy';
import {
  fetchHistoricalIrradiance,
  fetchForecastIrradiance,
  fetchMonthlyProjections,
} from '../utils/openMeteo';
import {
  getAutoconsumptionRate,
  aggregateByGranularity,
  computePeriodKPIs,
} from '../utils/dataProcessing';
import { format } from 'date-fns';
import { KPICards } from './KPICards';
import { Chart12Months } from './Chart12Months';
import { ChartRealVsExpected } from './ChartRealVsExpected';
import { ChartForecast14 } from './ChartForecast14';
import { ChartEnergyBreakdown } from './ChartEnergyBreakdown';
import { ChartSeasonal } from './ChartSeasonal';
import { ChartBilanEnergie } from './ChartBilanEnergie';

interface Props {
  data: EnergyData[];
  electricityPrice: number;
}

export function Dashboard({ data, electricityPrice }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [expectedData, setExpectedData] = useState<OpenMeteoData[]>([]);
  const [forecastData, setForecastData] = useState<OpenMeteoData[]>([]);
  const [monthlyProj, setMonthlyProj] = useState<MonthlyProjection[]>([]);
  const [loading, setLoading] = useState(true);

  const autoconsRate = useMemo(() => getAutoconsumptionRate(data), [data]);
  const filteredData = useMemo(() => aggregateByGranularity(data, granularity), [data, granularity]);
  const periodKPIs = useMemo(() => computePeriodKPIs(data, electricityPrice), [data, electricityPrice]);
  const avgDailyConsumption = useMemo(
    () => (data.length > 0 ? data.reduce((s, d) => s + d.consumed, 0) / data.length : 0),
    [data]
  );

  const importCost = periodKPIs.totalImported * electricityPrice;
  const netCostBalance = periodKPIs.totalSavings - importCost;

  const numMonths = useMemo(() => {
    if (data.length === 0) return 1;
    const start = data[0].date;
    const end = data[data.length - 1].date;
    const n =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    return Math.max(1, n);
  }, [data]);

  const monthlyImportCost = importCost / numMonths;

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
    Promise.all([
      fetchHistoricalIrradiance(minDate, maxDate),
      fetchForecastIrradiance(14),
      fetchMonthlyProjections(electricityPrice, autoconsRate),
    ])
      .then(([hist, fore, monthly]) => {
        setExpectedData(hist);
        setForecastData(fore);
        setMonthlyProj(monthly);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
      <KPICards
        avgDailyProduction={periodKPIs.avgDailyProduction}
        annualSavings={annualSavings}
        monthlyImportCost={monthlyImportCost}
        autoconsumption={periodKPIs.autoconsumption}
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
        autoconsRate={autoconsRate}
        electricityPrice={electricityPrice}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ChartRealVsExpected
          data={filteredData}
          expectedData={expectedData}
          granularity={granularity}
          onGranularity={setGranularity}
        />
        <ChartForecast14 forecastData={forecastData} />
      </div>

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
