import { useState, useEffect, useMemo } from 'react';
import { Sun, Zap, TrendingUp, Euro, ArrowUpRight, ArrowDownLeft, Activity, Gauge, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { EnergyData, KPIData, OpenMeteoData, Granularity, Season, MonthlyProjection, SeasonalStats } from '../types/energy';
import { calculateKPIs, aggregateByGranularity, filterBySeason, filterByDateRange, calculateSeasonalStats } from '../utils/dataProcessing';
import { fetchHistoricalIrradiance, fetchForecastIrradiance, calcPerformanceRatio, calcMonthlyProjections } from '../utils/openMeteo';
import { exportToExcel, exportToPDF } from '../utils/exportData';
import { KPICard } from './KPICard';
import { ProductionChart } from './ProductionChart';
import { EnergyStackedChart } from './EnergyStackedChart';
import { EnergyBreakdownChart } from './EnergyBreakdownChart';
import { ForecastChart } from './ForecastChart';
import { FilterSidebar } from './FilterSidebar';
import { ProjectionsSection } from './ProjectionsSection';
import { format } from 'date-fns';

interface Props {
  data: EnergyData[];
  isDark: boolean;
  electricityPrice: number;
}

export function Dashboard({ data, isDark, electricityPrice }: Props) {
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [season, setSeason]             = useState<Season>('all');
  const [granularity, setGranularity]   = useState<Granularity>('daily');
  const [expectedData, setExpectedData] = useState<OpenMeteoData[]>([]);
  const [forecastData, setForecastData] = useState<OpenMeteoData[]>([]);
  const [monthlyProj, setMonthlyProj]   = useState<MonthlyProjection[]>([]);
  const [loadingMeta, setLoadingMeta]   = useState(true);
  const [loadingProj, setLoadingProj]   = useState(true);
  const [exporting, setExporting]       = useState<'excel'|'pdf'|null>(null);

  // Init date range from data
  useEffect(() => {
    if (data.length > 0) {
      setStartDate(format(data[0].date, 'yyyy-MM-dd'));
      setEndDate(format(data[data.length - 1].date, 'yyyy-MM-dd'));
    }
  }, [data]);

  // Load Open-Meteo historical + forecast
  useEffect(() => {
    if (data.length === 0) return;
    setLoadingMeta(true);
    const minDate = data[0].date;
    const maxDate = data[data.length - 1].date;
    Promise.all([
      fetchHistoricalIrradiance(minDate, maxDate),
      fetchForecastIrradiance(14),
    ]).then(([hist, fore]) => {
      setExpectedData(hist);
      setForecastData(fore);
    }).catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, [data]);

  // Load 12-month projections (slower — separate effect)
  useEffect(() => {
    setLoadingProj(true);
    const autoconsRate = data.length > 0
      ? Math.min(0.95, Math.max(0.3, (data.reduce((s, d) => s + (d.produced - d.exported), 0) / Math.max(1, data.reduce((s, d) => s + d.produced, 0)))))
      : 0.70;
    calcMonthlyProjections(electricityPrice, autoconsRate)
      .then(setMonthlyProj)
      .catch(console.error)
      .finally(() => setLoadingProj(false));
  }, [electricityPrice, data]);

  // Filtered & aggregated data
  const filteredData = useMemo(() => {
    let d = data;
    if (startDate || endDate) d = filterByDateRange(d, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);
    d = filterBySeason(d, season);
    return aggregateByGranularity(d, granularity);
  }, [data, startDate, endDate, season, granularity]);

  const kpis: KPIData         = useMemo(() => calculateKPIs(filteredData, electricityPrice), [filteredData, electricityPrice]);
  const seasonalStats: SeasonalStats[] = useMemo(() => calculateSeasonalStats(filteredData, electricityPrice), [filteredData, electricityPrice]);

  const actualTotal   = filteredData.reduce((s, d) => s + d.produced, 0);
  const expectedTotal = expectedData.reduce((s, d) => s + d.expectedProduction, 0);
  const pr            = calcPerformanceRatio(actualTotal, expectedTotal);

  const dateRangeLabel = data.length > 0
    ? `${format(data[0].date,'dd/MM/yyyy')} → ${format(data[data.length-1].date,'dd/MM/yyyy')}`
    : '';

  const handleExportExcel = async () => {
    setExporting('excel');
    try { await exportToExcel(filteredData, kpis, monthlyProj, seasonalStats, electricityPrice); }
    catch (e) { console.error(e); }
    finally { setExporting(null); }
  };
  const handleExportPDF = async () => {
    setExporting('pdf');
    try { await exportToPDF(filteredData, kpis, monthlyProj, seasonalStats, electricityPrice, dateRangeLabel); }
    catch (e) { console.error(e); }
    finally { setExporting(null); }
  };

  const kpiCards = [
    { title: 'Production totale', value: kpis.totalProduced,    unit: 'kWh', change: kpis.productionChange, icon: Sun,           gradient: 'from-leaf-500 to-leaf-600',   shadow: 'leaf',   subtitle: `${(kpis.totalProduced / Math.max(1, filteredData.length)).toFixed(1)} kWh/jour` },
    { title: 'Autoconsommation',  value: kpis.autoconsumption,  unit: '%',   icon: Zap,           gradient: 'from-sky-500 to-sky-600',    shadow: 'sky',    subtitle: 'Production utilisée sur place' },
    { title: 'Autosuffisance',    value: kpis.selfSufficiency,  unit: '%',   icon: TrendingUp,    gradient: 'from-violet-500 to-violet-600', shadow: 'violet', subtitle: 'Conso. couverte par le solaire' },
    { title: 'Économies',         value: kpis.totalSavings,     unit: '€',   icon: Euro,          gradient: 'from-solar-500 to-solar-600', shadow: 'solar',  subtitle: `à ${electricityPrice.toFixed(2)} €/kWh` },
    { title: 'Exporté réseau',    value: kpis.totalExported,    unit: 'kWh', icon: ArrowUpRight,  gradient: 'from-amber-400 to-orange-500', shadow: 'orange', subtitle: 'Injecté sur le réseau EDF' },
    { title: 'Importé réseau',    value: kpis.totalImported,    unit: 'kWh', icon: ArrowDownLeft, gradient: 'from-rose-500 to-rose-600',   shadow: 'rose',   subtitle: 'Acheté au réseau EDF' },
    { title: 'Solde net',         value: kpis.netBalance,       unit: 'kWh', icon: Activity,      gradient: 'from-teal-500 to-teal-600',   shadow: 'teal',   subtitle: 'Produit − Consommé ± batterie' },
    { title: 'Performance Ratio', value: pr,                    unit: '%',   icon: Gauge,         gradient: 'from-indigo-500 to-indigo-600', shadow: 'indigo', subtitle: 'Réel / Théorique Open-Meteo' },
  ];

  return (
    <div className="space-y-8">
      {/* Export bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {filteredData.length} points · {season !== 'all' ? season : 'toutes saisons'} · {granularity}
        </p>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} disabled={!!exporting}
            className="btn-secondary text-xs gap-1.5 disabled:opacity-50">
            {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Excel
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting}
            className="btn-secondary text-xs gap-1.5 disabled:opacity-50">
            {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF
          </button>
          <span className={`hidden sm:flex items-center text-xs px-3 py-2 rounded-xl border gap-1.5 ${
            isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
          }`}>
            {loadingMeta ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-leaf-500 inline-block" />}
            {loadingMeta ? 'Open-Meteo…' : 'Open-Meteo ✓'}
          </span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map(k => (
          <KPICard key={k.title} {...k} isDark={isDark} />
        ))}
      </div>

      {/* Main content: sidebar + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <FilterSidebar
            startDate={startDate} endDate={endDate}
            season={season} granularity={granularity}
            onStartDate={setStartDate} onEndDate={setEndDate}
            onSeason={setSeason} onGranularity={setGranularity}
            isDark={isDark}
          />
        </div>

        {/* Charts */}
        <div className="lg:col-span-3 space-y-5">
          <ProductionChart data={filteredData} expectedData={expectedData} isDark={isDark} />
          <EnergyStackedChart data={filteredData} isDark={isDark} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <EnergyBreakdownChart kpiData={kpis} isDark={isDark} />
            <ForecastChart forecastData={forecastData} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Projections */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className={`text-lg font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Projections & Analyse saisonnière
          </h2>
          {loadingProj && (
            <span className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Loader2 size={12} className="animate-spin" /> Calcul des projections…
            </span>
          )}
        </div>
        <ProjectionsSection
          monthlyProjections={monthlyProj}
          seasonalStats={seasonalStats}
          isDark={isDark}
          electricityPrice={electricityPrice}
        />
      </div>
    </div>
  );
}
