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
  bestDayKwh: number;
  bestDayDate: string;
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
}: Props) {
  const exportRevenue = totalExported * EXPORT_PRICE;

  const cards = [
    {
      title: 'Prod. journalière moyenne',
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
      subtitle: 'Météo + taux autoconsommation',
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
      value: totalImported.toFixed(0),
      unit: 'kWh',
      subtitle: 'Acheté au réseau',
      icon: ArrowDownLeft,
      color: '#f87171',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <div key={c.title} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
                  {c.title}
                </p>
                <p className="font-display text-2xl font-bold text-white leading-tight" style={{ color: c.color }}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <div className="card p-5 border-l-4 border-[#f59e0b]/60">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
            Résumé coûts (période)
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Économies (autoconsommation)</span>
              <span className="font-semibold text-[#22c55e]">+{periodSavings.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Revenu export (0.04 €/kWh)</span>
              <span className="font-semibold text-[#f59e0b]">+{exportRevenue.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Coût importé (réseau)</span>
              <span className="font-semibold text-rose-400">−{importCost.toFixed(2)} €</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between items-baseline">
              <span className="text-slate-300 font-medium">Bilan net</span>
              <span className={`font-display font-bold text-lg ${netCostBalance >= 0 ? 'text-[#22c55e]' : 'text-rose-400'}`}>
                {netCostBalance >= 0 ? '+' : ''}{netCostBalance.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-[#22c55e]/60 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
            <Sun size={14} /> Meilleur jour
          </div>
          <p className="font-display text-2xl font-bold text-white">
            {bestDayKwh.toFixed(1)} kWh
          </p>
          <p className="text-slate-400 text-sm mt-0.5">le {bestDayDate}</p>
        </div>
      </div>
    </div>
  );
}
