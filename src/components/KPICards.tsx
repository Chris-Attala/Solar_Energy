import { Sun, Euro, TrendingUp, ArrowUpRight, ArrowDownLeft, BarChart2 } from 'lucide-react';

interface Props {
  avgDailyProduction: number;
  annualSavings: number;
  monthlyNetBalance: number;
  selfSufficiencyPerDay: number;
  totalExported: number;
  totalImported: number;
  periodSavings: number;
  importCost: number;
  netCostBalance: number;
  periodDays: number;
  bestDayKwh: number;
  bestDayDate: string;
  bestDayConsumed: number;
  bestDayExported: number;
  bestDayImported: number;
  bestDaySelfConsumed: number;
  bestDaySavings: number;
  bestDaySelfSufficiency: number;
}

const EXPORT_PRICE = 0.04;

export function KPICards({
  avgDailyProduction, annualSavings, monthlyNetBalance, selfSufficiencyPerDay,
  totalExported, totalImported, periodSavings, importCost, netCostBalance,
  bestDayKwh, bestDayDate, bestDayConsumed, bestDayExported, bestDayImported,
  bestDaySelfConsumed, bestDaySavings, bestDaySelfSufficiency, periodDays,
}: Props) {
  const exportRevenue = totalExported * EXPORT_PRICE;

  const cards = [
    { title: 'Production moy./j', value: avgDailyProduction.toFixed(1), unit: 'kWh/j', subtitle: 'Sur la période chargée', icon: Sun, color: '#22c55e' },
    { title: 'Autosuffisance',    value: selfSufficiencyPerDay.toFixed(0), unit: '%', subtitle: 'Couverte par le solaire', icon: TrendingUp, color: '#38bdf8' },
    { title: 'Économies annuelles', value: annualSavings.toFixed(0), unit: '€', subtitle: 'Sur les 12 prochains mois', icon: Euro, color: '#f59e0b' },
    { title: 'Exporté réseau',    value: totalExported.toFixed(0), unit: 'kWh', subtitle: `≈ ${exportRevenue.toFixed(0)} € à 0.04 €/kWh`, icon: ArrowUpRight, color: '#f59e0b' },
    { title: 'Bilan mensuel',     value: monthlyNetBalance >= 0 ? `+${monthlyNetBalance.toFixed(0)}` : monthlyNetBalance.toFixed(0), unit: '€/mois', subtitle: 'Éco. + export − import', icon: BarChart2, color: monthlyNetBalance >= 0 ? '#22c55e' : '#f87171' },
    { title: 'Importé réseau',    value: periodDays > 0 ? (totalImported / periodDays * 30.44).toFixed(0) : '0', unit: 'kWh/mois', subtitle: `Total : ${totalImported.toFixed(0)} kWh`, icon: ArrowDownLeft, color: '#f87171' },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {cards.map((c) => (
          <div key={c.title} className="card p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1 leading-tight">
                  {c.title}
                </p>
                <p className="font-display font-bold leading-tight" style={{ color: c.color }}>
                  <span className="text-base sm:text-2xl">{c.value}</span>
                  <span className="text-slate-400 font-normal text-[10px] sm:text-base ml-1">{c.unit}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-snug">{c.subtitle}</p>
              </div>
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${c.color}20` }}>
                <c.icon size={16} style={{ color: c.color }} className="sm:hidden" />
                <c.icon size={22} style={{ color: c.color }} className="hidden sm:block" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 mt-3 sm:mt-5">
        <div className="card p-3 sm:p-5 border-l-4 border-[#f59e0b]/60">
          <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
            Résumé coûts (période)
          </p>
          <div className="space-y-1.5 text-[10px] sm:text-sm">
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-slate-400">Économies autoconso.</span>
              <span className="font-semibold text-[#22c55e] whitespace-nowrap">+{periodSavings.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-slate-400 sm:hidden">Export</span>
              <span className="text-slate-400 hidden sm:inline">Revenu export (0.04 €/kWh)</span>
              <span className="font-semibold text-[#f59e0b] whitespace-nowrap">+{exportRevenue.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-slate-400 sm:hidden">Coût import</span>
              <span className="text-slate-400 hidden sm:inline">Coût importé ({totalImported.toFixed(0)} kWh)</span>
              <span className="font-semibold text-rose-400 whitespace-nowrap">−{importCost.toFixed(2)} €</span>
            </div>
            <div className="pt-1.5 mt-1.5 border-t border-slate-700 flex justify-between items-baseline">
              <span className="text-slate-300 font-medium text-[10px] sm:text-sm">Bilan net</span>
              <span className={`font-display font-bold text-sm sm:text-lg ${netCostBalance >= 0 ? 'text-[#22c55e]' : 'text-rose-400'}`}>
                {netCostBalance >= 0 ? '+' : ''}{netCostBalance.toFixed(2)} €
              </span>
            </div>
            {(() => {
              const total = periodSavings + exportRevenue + importCost;
              const goodPct = total > 0 ? Math.min(100, ((periodSavings + exportRevenue) / total) * 100) : 0;
              return (
                <div className="mt-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-[#22c55e] transition-all" style={{ width: `${goodPct}%` }} />
                    <div className="bg-rose-500/70 flex-1" />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>Gains {(periodSavings + exportRevenue).toFixed(0)} €</span>
                    <span>Coûts {importCost.toFixed(0)} €</span>
                  </div>
                </div>
              );
            })()}
            {periodDays > 0 && (
              <div className="flex justify-between mt-1.5 pt-1.5 border-t border-slate-800">
                <div>
                  <div className="text-[9px] text-slate-600 uppercase tracking-wider">Éco./jour</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#22c55e] whitespace-nowrap">+{((periodSavings + exportRevenue) / periodDays).toFixed(2)} €</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-600 uppercase tracking-wider">Coût/jour</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-rose-400 whitespace-nowrap">−{(importCost / periodDays).toFixed(2)} €</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-3 sm:p-5 border-l-4 border-[#22c55e]/60">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-slate-500 text-[9px] sm:text-xs font-medium uppercase tracking-wider">
              <Sun size={12} /> Meilleur jour
            </div>
            <span className="text-[9px] sm:text-xs text-slate-500">{bestDayDate}</span>
          </div>
          <p className="font-display text-base sm:text-2xl font-bold text-[#22c55e] mb-1.5">
            {bestDayKwh.toFixed(1)} kWh
          </p>
          <div className="space-y-1 text-[10px] sm:text-xs">
            {[
              { label: 'Consommé',   value: `${bestDayConsumed.toFixed(1)} kWh`,      color: 'text-slate-300' },
              { label: 'Autoconso.', value: `${bestDaySelfConsumed.toFixed(1)} kWh`,  color: 'text-[#22c55e]' },
              { label: 'Exporté',    value: `${bestDayExported.toFixed(1)} kWh`,      color: 'text-amber-400' },
              { label: 'Importé',    value: `${bestDayImported.toFixed(1)} kWh`,      color: 'text-rose-400' },
              { label: 'Économies',  value: `${bestDaySavings.toFixed(2)} €`,         color: 'text-[#22c55e]' },
              { label: 'Autosuff.', value: `${bestDaySelfSufficiency.toFixed(0)} %`,  color: 'text-sky-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-slate-500">{label}</span>
                <span className={`font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}