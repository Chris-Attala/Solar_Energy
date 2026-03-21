import { Sun, Euro, TrendingUp, ArrowUpRight, ArrowDownLeft, BarChart2 } from 'lucide-react';
import { formatFrInt, formatFr1, formatFr2 } from '../utils/formatNumber';
import { EXPORT_PRICE_EUR_PER_KWH } from '../utils/constants';

interface Props {
  avgDailyProduction: number;
  annualSavings: number;
  monthlyNetBalance: number;
  selfSufficiencyPerDay: number;
  totalExported: number;
  totalImported: number;
  periodSavings: number;
  selfConsumedKwh: number;
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

export function KPICards({
  avgDailyProduction, annualSavings, monthlyNetBalance, selfSufficiencyPerDay,
  totalExported, totalImported, periodSavings, selfConsumedKwh, importCost, netCostBalance,
  bestDayKwh, bestDayDate, bestDayConsumed, bestDayExported, bestDayImported,
  bestDaySelfConsumed, bestDaySavings, bestDaySelfSufficiency, periodDays,
}: Props) {
  const exportRevenue = totalExported * EXPORT_PRICE_EUR_PER_KWH;

  const cards = [
    { title: 'Production moy./j', value: formatFr1(avgDailyProduction), unit: 'kWh/j', subtitle: 'Sur la période chargée', icon: Sun, color: '#22c55e' },
    { title: 'Autosuffisance',    value: formatFrInt(selfSufficiencyPerDay), unit: '%', subtitle: 'Couverte par le solaire', icon: TrendingUp, color: '#38bdf8' },
    { title: 'Économies annuelles', value: formatFrInt(annualSavings), unit: '€', subtitle: 'Sur les 12 prochains mois', icon: Euro, color: '#f59e0b' },
    { title: 'Exporté réseau',    value: formatFrInt(totalExported), unit: 'kWh', subtitle: `≈ ${formatFrInt(exportRevenue)} € à 0,04 €/kWh`, icon: ArrowUpRight, color: '#f59e0b' },
    { title: 'Bilan mensuel',     value: monthlyNetBalance >= 0 ? `+${formatFrInt(monthlyNetBalance)}` : formatFrInt(monthlyNetBalance), unit: '€/mois', subtitle: 'Éco. + export − import', icon: BarChart2, color: monthlyNetBalance >= 0 ? '#22c55e' : '#f87171' },
    { title: 'Importé réseau',    value: periodDays > 0 ? formatFrInt((totalImported / periodDays) * 30.44) : '0', unit: 'kWh/mois', subtitle: `Total : ${formatFrInt(totalImported)} kWh`, icon: ArrowDownLeft, color: '#f87171' },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {cards.map((c) => (
          <div key={c.title} className="card p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-theme-secondary mb-1 leading-tight">
                  {c.title}
                </p>
                <p className="font-display font-bold leading-tight" style={{ color: c.color }}>
                  <span className="text-base sm:text-2xl">{c.value}</span>
                  <span className="text-theme-secondary font-normal text-[10px] sm:text-base ml-1">{c.unit}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-theme-secondary mt-1 leading-snug">{c.subtitle}</p>
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
          <div className="mb-2">
            <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-theme-secondary">
              Résumé coûts (période)
            </p>
            {periodDays > 0 && (
              <p className="text-[9px] sm:text-[10px] text-theme-muted mt-0.5 normal-case tracking-normal">
                {formatFrInt(periodDays)} jour{periodDays > 1 ? 's' : ''} concerné{periodDays > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="space-y-1.5 text-[10px] sm:text-sm">
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-theme-secondary min-w-0 pr-1">
                Économies autoconso.{' '}
                <span className="text-theme-muted font-normal">({formatFrInt(selfConsumedKwh)} kWh)</span>
              </span>
              <span className="font-semibold text-[#22c55e] whitespace-nowrap">+{formatFr2(periodSavings)} €</span>
            </div>
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-theme-secondary sm:hidden">
                Export ({formatFrInt(totalExported)} kWh à 0,04 €)
              </span>
              <span className="text-theme-secondary hidden sm:inline">
                Revenu export ({formatFrInt(totalExported)} kWh exportés à 0,04 €/kWh)
              </span>
              <span className="font-semibold text-[#f59e0b] whitespace-nowrap">+{formatFr2(exportRevenue)} €</span>
            </div>
            <div className="flex justify-between items-baseline gap-1">
              <span className="text-theme-secondary sm:hidden">Coût import</span>
              <span className="text-theme-secondary hidden sm:inline">Coût importé ({formatFrInt(totalImported)} kWh)</span>
              <span className="font-semibold text-rose-400 whitespace-nowrap">−{formatFr2(importCost)} €</span>
            </div>
            <div className="pt-1.5 mt-1.5 border-t flex justify-between items-baseline" style={{ borderColor: 'var(--border)' }}>
              <span className="text-theme font-medium text-[10px] sm:text-sm">Bilan net</span>
              <span className={`font-display font-bold text-sm sm:text-lg ${netCostBalance >= 0 ? 'text-[#22c55e]' : 'text-rose-400'}`}>
                {netCostBalance >= 0 ? '+' : ''}{formatFr2(netCostBalance)} €
              </span>
            </div>
            {(() => {
              const total = periodSavings + exportRevenue + importCost;
              const goodPct = total > 0 ? Math.min(100, ((periodSavings + exportRevenue) / total) * 100) : 0;
              return (
                <div className="mt-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                    <div className="bg-[#22c55e] transition-all" style={{ width: `${goodPct}%` }} />
                    <div className="bg-rose-500/70 flex-1" />
                  </div>
                  <div className="flex justify-between text-[9px] text-theme-muted mt-1">
                    <span>Gains {formatFrInt(periodSavings + exportRevenue)} €</span>
                    <span>Coûts {formatFrInt(importCost)} €</span>
                  </div>
                </div>
              );
            })()}
            {periodDays > 0 && (
              <div className="flex justify-between mt-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[9px] text-theme-muted uppercase tracking-wider">Éco./jour</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#22c55e] whitespace-nowrap">+{formatFr2((periodSavings + exportRevenue) / periodDays)} €</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-theme-muted uppercase tracking-wider">Coût/jour</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-rose-400 whitespace-nowrap">−{formatFr2(importCost / periodDays)} €</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-3 sm:p-5 border-l-4 border-[#22c55e]/60">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-theme-secondary text-[9px] sm:text-xs font-medium uppercase tracking-wider">
              <Sun size={12} /> Meilleur jour
            </div>
            <span className="text-[9px] sm:text-xs text-theme-secondary">{bestDayDate}</span>
          </div>
          <p className="font-display text-base sm:text-2xl font-bold text-[#22c55e] mb-1.5">
            {formatFr1(bestDayKwh)} kWh
          </p>
          <div className="space-y-1 text-[10px] sm:text-xs">
            {[
              { label: 'Consommé',   value: `${formatFr1(bestDayConsumed)} kWh`,      color: 'text-theme' },
              { label: 'Autoconso.', value: `${formatFr1(bestDaySelfConsumed)} kWh`,  color: 'text-[#22c55e]' },
              { label: 'Exporté',    value: `${formatFr1(bestDayExported)} kWh`,      color: 'text-amber-400' },
              { label: 'Importé',    value: `${formatFr1(bestDayImported)} kWh`,      color: 'text-rose-400' },
              { label: 'Économies',  value: `${formatFr2(bestDaySavings)} €`,         color: 'text-[#22c55e]' },
              { label: 'Autosuff.', value: `${formatFrInt(bestDaySelfSufficiency)} %`,  color: 'text-sky-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-theme-secondary">{label}</span>
                <span className={`font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}