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

const EXPORT_PRICE = 0.04; // €/kWh rachat EDF

export function KPICards({
  avgDailyProduction,
  annualSavings,
  monthlyNetBalance,
  selfSufficiencyPerDay,
  totalExported,
  totalImported,
  periodSavings,
  importCost,
  netCostBalance,
  bestDayKwh,
  bestDayDate,
  bestDayConsumed,
  bestDayExported,
  bestDayImported,
  bestDaySelfConsumed,
  bestDaySavings,
  bestDaySelfSufficiency,
  periodDays,
}: Props) {
  const exportRevenue = totalExported * EXPORT_PRICE;

  const cards = [
    {
      title: 'Production moy./jour',
      value: avgDailyProduction.toFixed(1),
      unit: 'kWh/j',
      subtitle: 'Sur la période chargée',
      icon: Sun,
      color: '#22c55e',
    },
    {
      title: 'Économies annuelles projetées',
      value: annualSavings.toFixed(0),
      unit: '€',
      subtitle: 'Sur les 12 prochains mois',
      icon: Euro,
      color: '#f59e0b',
    },
    {
      title: 'Bilan mensuel',
      value: monthlyNetBalance >= 0 ? `+${monthlyNetBalance.toFixed(0)}` : monthlyNetBalance.toFixed(0),
      unit: '€/mois',
      subtitle: 'Économies + export − import',
      icon: BarChart2,
      color: monthlyNetBalance >= 0 ? '#22c55e' : '#f87171',
    },
    {
      title: 'Autosuffisance / jour',
      value: selfSufficiencyPerDay.toFixed(0),
      unit: '%',
      subtitle: 'Conso. couverte par le solaire',
      icon: TrendingUp,
      color: '#38bdf8',
    },
    {
      title: 'Exporté réseau',
      value: totalExported.toFixed(0),
      unit: 'kWh',
      subtitle: `≈ ${exportRevenue.toFixed(0)} € à 0.04 €/kWh`,
      icon: ArrowUpRight,
      color: '#f59e0b',
    },
    {
      title: 'Importé réseau',
      value: periodDays > 0 ? (totalImported / periodDays * 30.44).toFixed(0) : '0',
      unit: 'kWh/mois',
      subtitle: `Total période : ${totalImported.toFixed(0)} kWh`,
      icon: ArrowDownLeft,
      color: '#f87171',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <div key={c.title} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
                  {c.title}
                </p>
                <p className="font-display text-xl sm:text-2xl font-bold text-white leading-tight" style={{ color: c.color }}>
                  {c.value}
                  <span className="text-slate-400 font-normal text-base ml-1">{c.unit}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1.5 leading-snug">{c.subtitle}</p>
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${c.color}20` }}
              >
                <c.icon size={22} style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bloc coûts + meilleur jour */}
      <div className="grid grid-cols-2 gap-5 mt-5">
        <div className="card p-5 border-l-4 border-[#f59e0b]/60">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
            Résumé coûts (période)
          </p>
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Économies autoconso.</span>
              <span className="font-semibold text-[#22c55e]">+{periodSavings.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400"><span className="hidden sm:inline">Revenu export (0.04 €/kWh)</span><span className="sm:hidden">Export réseau</span></span>
              <span className="font-semibold text-[#f59e0b]">+{exportRevenue.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400"><span className="hidden sm:inline">Coût importé ({totalImported.toFixed(0)} kWh)</span><span className="sm:hidden">Coût import</span></span>
              <span className="font-semibold text-rose-400">−{importCost.toFixed(2)} €</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between items-baseline">
              <span className="text-slate-300 font-medium">Bilan net</span>
              <span className={`font-display font-bold text-base sm:text-lg ${netCostBalance >= 0 ? 'text-[#22c55e]' : 'text-rose-400'}`}>
                {netCostBalance >= 0 ? '+' : ''}{netCostBalance.toFixed(2)} €
              </span>
            </div>
            {/* Barre de progression visuelle */}
            {(() => {
              const total = periodSavings + exportRevenue + importCost;
              const goodPct = total > 0 ? Math.min(100, ((periodSavings + exportRevenue) / total) * 100) : 0;
              return (
                <div className="mt-3">
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-[#22c55e] transition-all" style={{ width: `${goodPct}%` }} />
                    <div className="bg-rose-500/70 flex-1" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                    <span>Gains {(periodSavings + exportRevenue).toFixed(0)} €</span>
                    <span>Coûts {importCost.toFixed(0)} €</span>
                  </div>
                </div>
              );
            })()}
            {/* Stats par jour */}
            {periodDays > 0 && (
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Économies/jour</div>
                  <div className="text-sm font-semibold text-[#22c55e]">+{((periodSavings + exportRevenue) / periodDays).toFixed(2)} €</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Coût/jour</div>
                  <div className="text-sm font-semibold text-rose-400">−{(importCost / periodDays).toFixed(2)} €</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card p-5 border-l-4 border-[#22c55e]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
              <Sun size={14} /> Meilleur jour
            </div>
            <span className="text-xs text-slate-500">{bestDayDate}</span>
          </div>
          <p className="font-display text-lg sm:text-2xl font-bold text-[#22c55e] mb-2">
            {bestDayKwh.toFixed(1)} kWh produits
          </p>
          <div className="space-y-1 text-[11px] sm:text-xs">
            {[
              { label: 'Consommé',      value: `${bestDayConsumed.toFixed(1)} kWh`,      color: 'text-slate-300' },
              { label: 'Autoconso.',    value: `${bestDaySelfConsumed.toFixed(1)} kWh`,  color: 'text-[#22c55e]' },
              { label: 'Exporté',       value: `${bestDayExported.toFixed(1)} kWh`,      color: 'text-amber-400' },
              { label: 'Importé',       value: `${bestDayImported.toFixed(1)} kWh`,      color: 'text-rose-400' },
              { label: 'Économies',     value: `${bestDaySavings.toFixed(2)} €`,         color: 'text-[#22c55e]' },
              { label: 'Autosuffis.',   value: `${bestDaySelfSufficiency.toFixed(0)} %`, color: 'text-sky-400' },
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