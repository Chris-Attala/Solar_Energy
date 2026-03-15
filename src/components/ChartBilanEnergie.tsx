import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData } from '../types/energy';
import { filterBySeason, type SeasonFilter } from '../utils/dataProcessing';

type BilanType = 'total' | 'jour' | 'semaine' | 'mois';

const TYPE_OPTIONS: { value: BilanType; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'jour', label: 'Moy. journalière' },
  { value: 'semaine', label: 'Moy. hebdo' },
  { value: 'mois', label: 'Moy. mensuelle' },
];

const SEASON_OPTIONS: { value: SeasonFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'winter', label: 'Hiver' },
  { value: 'spring', label: 'Printemps' },
  { value: 'summer', label: 'Été' },
  { value: 'autumn', label: 'Automne' },
];

interface Props {
  data: EnergyData[];
  electricityPrice: number;
}

function getNumMonths(start: Date, end: Date): number {
  const n =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(1, n);
}

export function ChartBilanEnergie({ data, electricityPrice }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [bilanType, setBilanType] = useState<BilanType>('total');
  const [season, setSeason] = useState<SeasonFilter>('all');

  const filteredData = season === 'all' ? data : filterBySeason(data, season);
  const hasNoDataForSeason = season !== 'all' && filteredData.length === 0;

  useEffect(() => {
    if (!ref.current || filteredData.length === 0) return;

    const days = filteredData.length;
    const numWeeks = Math.max(1, Math.ceil(days / 7));
    const start = filteredData[0].date;
    const end = filteredData[filteredData.length - 1].date;
    const numMonths = getNumMonths(start, end);

    let totalProduced = filteredData.reduce((s, d) => s + d.produced, 0);
    let totalConsumed = filteredData.reduce((s, d) => s + d.consumed, 0);
    let totalExported = filteredData.reduce((s, d) => s + d.exported, 0);
    let totalImported = filteredData.reduce((s, d) => s + d.imported, 0);

    let divisor = 1;
    let xLabel = 'kWh';
    if (bilanType === 'jour') {
      divisor = days;
      xLabel = 'kWh/jour';
    } else if (bilanType === 'semaine') {
      divisor = numWeeks;
      xLabel = 'kWh/semaine';
    } else if (bilanType === 'mois') {
      divisor = numMonths;
      xLabel = 'kWh/mois';
    }

    const produced = totalProduced / divisor;
    const consumed = totalConsumed / divisor;
    const exported = totalExported / divisor;
    const imported = totalImported / divisor;
    const importCost = (totalImported * electricityPrice) / (bilanType === 'mois' ? numMonths : bilanType === 'semaine' ? numWeeks : bilanType === 'jour' ? days : 1);

    const labels = ['Produit', 'Consommé', 'Exporté', 'Importé'];
    const values = [produced, consumed, exported, imported];
    const colors = ['#22c55e', '#38bdf8', '#f59e0b', '#f87171'];

    const fmt = bilanType === 'total' ? (n: number) => n.toFixed(0) : (n: number) => n.toFixed(1);
    const trace: Plotly.Data = {
      x: values,
      y: labels,
      type: 'bar',
      orientation: 'h',
      marker: { color: colors },
      text: labels.map((l, i) => {
        const v = values[i];
        if (i === 3) return `${fmt(v)} kWh (${importCost.toFixed(2)} €)`;
        return `${fmt(v)} kWh`;
      }),
      textposition: 'outside',
      hovertemplate: '<b>%{y}</b><br>%{x:.1f} kWh<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#0d1520',
      plot_bgcolor: '#0d1520',
      font: { color: '#94a3b8', family: 'DM Sans' },
      xaxis: {
        title: { text: xLabel, font: { color: '#94a3b8' } },
        gridcolor: '#1e293b',
        zeroline: false,
      },
      yaxis: { gridcolor: 'transparent', color: '#94a3b8' },
      margin: { l: 80, r: 130, t: 20, b: 40 },
      bargap: 0.4,
      showlegend: false,
      autosize: true,
    };

    Plotly.react(ref.current, [trace], layout, { responsive: true, displayModeBar: false });
  }, [filteredData, electricityPrice, bilanType]);

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-display">
            Bilan énergie
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Produit · Consommé · Exporté · Importé</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-slate-800/80">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBilanType(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  bilanType === opt.value ? 'bg-[#22c55e] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-slate-800/80">
            {SEASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeason(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  season === opt.value ? 'bg-[#f59e0b] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {hasNoDataForSeason ? (
        <div className="flex items-center justify-center rounded-xl bg-slate-800/50 border border-slate-700 text-slate-500 text-sm py-12">
          Aucune donnée pour cette saison dans la période chargée.
        </div>
      ) : (
        <div ref={ref} style={{ width: '100%', height: 220 }} />
      )}
    </div>
  );
}
