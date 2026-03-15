import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  icon: LucideIcon;
  gradient: string;
  shadow: string;
  isDark: boolean;
  subtitle?: string;
}

export function KPICard({ title, value, unit, change, icon: Icon, gradient, shadow, isDark, subtitle }: Props) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  const display = isNaN(num) ? String(value) : num >= 10000 ? num.toFixed(0) : num >= 100 ? num.toFixed(1) : num.toFixed(2);

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group cursor-default ${
      isDark ? 'bg-[#0d1520] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'
    } hover:shadow-${shadow}`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${gradient}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="text-white" size={20} />
          </div>
          {change !== undefined && Math.abs(change) > 0.01 && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              change >= 0
                ? isDark ? 'bg-leaf-900/40 text-leaf-400' : 'bg-leaf-50 text-leaf-700'
                : isDark ? 'bg-red-900/40  text-red-400'  : 'bg-red-50  text-red-700'
            }`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>

        <div className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </div>

        <div className={`font-display text-[1.6rem] font-extrabold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {display}
          {unit && (
            <span className={`text-sm font-semibold ml-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
          )}
        </div>

        {subtitle && (
          <div className={`text-xs mt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
