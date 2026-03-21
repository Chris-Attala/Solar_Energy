import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { EnergyData } from '../types/energy';
import { useTheme, plotThemeColors } from '../context/ThemeContext';
import { filterBySeason, type SeasonFilter } from '../utils/dataProcessing';
import { formatFrInt, formatFr1, formatFr2 } from '../utils/formatNumber';
import { EXPORT_PRICE_EUR_PER_KWH } from '../utils/constants';

type BilanType = 'total' | 'jour' | 'semaine' | 'mois';

const TYPE_OPTIONS: { value: BilanType; label: string }[] = [
  { value: 'total',   label: 'Total' },
  { value: 'jour',    label: 'Moy. journalière' },
  { value: 'semaine', label: 'Moy. hebdo' },
  { value: 'mois',    label: 'Moy. mensuelle' },
];

const SEASON_OPTIONS: { value: SeasonFilter; label: string }[] = [
  { value: 'all',    label: 'Toutes' },
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
  return Math.max(1,
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) + 1
  );
}

export function ChartBilanEnergie({ data, electricityPrice }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [bilanType, setBilanType] = useState<BilanType>('total');
  const [season, setSeason]       = useState<SeasonFilter>('all');

  const filteredData      = season === 'all' ? data : filterBySeason(data, season);
  const hasNoDataForSeason = season !== 'all' && filteredData.length === 0;

  useEffect(() => {
    if (!ref.current || filteredData.length === 0) return;

    const days      = filteredData.length;
    const numWeeks  = Math.max(1, Math.ceil(days / 7));
    const start     = filteredData[0].date;
    const end       = filteredData[filteredData.length - 1].date;
    const numMonths = getNumMonths(start, end);

    const totalProduced = filteredData.reduce((s, d) => s + d.produced, 0);
    const totalConsumed = filteredData.reduce((s, d) => s + d.consumed, 0);
    const totalExported = filteredData.reduce((s, d) => s + d.exported, 0);
    const totalImported = filteredData.reduce((s, d) => s + d.imported, 0);

    // Diviseur unique selon le type — appliqué partout de façon cohérente
    const divisor = bilanType === 'jour' ? days
                  : bilanType === 'semaine' ? numWeeks
                  : bilanType === 'mois' ? numMonths
                  : 1;

    const xLabel = bilanType === 'jour' ? 'kWh/jour'
                 : bilanType === 'semaine' ? 'kWh/semaine'
                 : bilanType === 'mois' ? 'kWh/mois'
                 : 'kWh';

    const produced      = totalProduced / divisor;
    const consumed      = totalConsumed / divisor;
    const exported      = totalExported / divisor;
    const imported      = totalImported / divisor;
    const selfConsumed  = Math.max(0, totalProduced - totalExported) / divisor;
    const importCost    = (totalImported * electricityPrice) / divisor;
    const selfSavingsEur = selfConsumed * electricityPrice;
    const consumedValueEur = consumed * electricityPrice;
    const exportRevenueEur = exported * EXPORT_PRICE_EUR_PER_KWH;

    const fmt = (n: number) => (bilanType === 'total' ? formatFrInt(n) : formatFr1(n));

    const eur = (n: number) => formatFr2(n);
    const pt = plotThemeColors(isDark);
    const priceLbl = eur(electricityPrice);
    const exportLbl = eur(EXPORT_PRICE_EUR_PER_KWH);

    const barX = [produced, selfConsumed, consumed, exported, imported];
    const maxBar = Math.max(...barX, 1e-9);
    // Sur barre courte, Plotly réduit le texte "inside" à une taille minuscule → label à l'extérieur
    const narrowFrac = 0.22;
    const textposition = barX.map((v) =>
      v / maxBar < narrowFrac ? ('outside' as const) : ('inside' as const)
    );
    const outsideLabelColor = isDark ? '#e2e8f0' : '#0f172a';
    const hasOutside = textposition.some((p) => p === 'outside');

    /**
     * textfont : base obligatoire pour y() dans Plotly (fusion inside/outside).
     * constraintext 'none' : sans ça Plotly scale le SVG (transform) pour le texte *inside* seulement,
     * le texte *outside* reste à l’échelle 1 → paraît plus gros que les autres (même font-size déclarée).
     */
    const trace = {
      x: barX,
      y: ['Produit', 'Autoconsommé', 'Consommé', 'Exporté', 'Importé'],
      type: 'bar' as const,
      orientation: 'h' as const,
      constraintext: 'none' as const,
      marker: { color: ['#22c55e', '#4ade80', '#38bdf8', '#f59e0b', '#f87171'] },
      text: [
        `${fmt(produced)} kWh`,
        `${fmt(selfConsumed)} kWh (${eur(selfSavingsEur)} €)`,
        `${fmt(consumed)} kWh (${eur(consumedValueEur)} €)`,
        `${fmt(exported)} kWh (${eur(exportRevenueEur)} €)`,
        `${fmt(imported)} kWh (${eur(importCost)} €)`,
      ],
      // Plotly accepte un tableau par barre ; les types @types/plotly sont incomplets
      textposition: textposition as unknown as 'inside',
      textfont: {
        family: 'DM Sans, sans-serif',
        size: 12,
      },
      insidetextfont: { color: '#0f172a' },
      outsidetextfont: { color: outsideLabelColor },
      customdata: [
        '',
        `<br>Économies : ${eur(selfSavingsEur)} € · ${priceLbl} €/kWh`,
        `<br>Indicatif conso. : ${eur(consumedValueEur)} € · ${priceLbl} €/kWh`,
        `<br>Revenu export : ${eur(exportRevenueEur)} € · ${exportLbl} €/kWh`,
        `<br>Coût import : ${eur(importCost)} € · ${priceLbl} €/kWh`,
      ],
      hovertemplate: '<b>%{y}</b><br>%{x:.1f} kWh%{customdata}<extra></extra>',
    } as unknown as Plotly.Data;
    Plotly.react(ref.current, [trace], {
      paper_bgcolor: pt.paper,
      plot_bgcolor: pt.plot,
      separators: pt.separators,
      font: { color: pt.text, family: 'DM Sans, sans-serif', size: 11 },
      xaxis: {
        title: { text: xLabel, font: { color: pt.text } },
        gridcolor: pt.grid,
        zeroline: false,
        autorange: true,
      },
      yaxis: {
        gridcolor: 'transparent',
        color: pt.text,
        automargin: true,
        tickfont: { size: 11 },
      },
      margin: { l: 24, r: hasOutside ? 56 : 28, t: 20, b: 40 },
      bargap: 0.4,
      showlegend: false, dragmode: false as unknown as Plotly.Layout['dragmode'],
      autosize: true,
    }, { responsive: true, displayModeBar: false, scrollZoom: false, doubleClick: false, showTips: false, modeBarButtonsToRemove: ["zoom2d","pan2d","select2d","lasso2d","zoomIn2d","zoomOut2d","autoScale2d","resetScale2d"] });

  }, [filteredData, electricityPrice, bilanType, isDark]);

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-theme-secondary font-display">
            Bilan énergie
          </h3>
          <p className="text-xs text-theme-muted mt-0.5">Produit · Autoconsommé · Consommé · Exporté · Importé</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="surface-muted flex gap-1 p-1 rounded-lg">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setBilanType(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  bilanType === opt.value ? 'bg-[#22c55e] text-white' : 'text-theme-secondary hover:text-theme'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="surface-muted flex gap-1 p-1 rounded-lg">
            {SEASON_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSeason(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  season === opt.value ? 'bg-[#f59e0b] text-white' : 'text-theme-secondary hover:text-theme'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {hasNoDataForSeason ? (
        <div className="surface-muted flex items-center justify-center rounded-xl text-theme-secondary text-sm py-12">
          Aucune donnée pour cette saison dans la période chargée.
        </div>
      ) : (
        <div className="plot-bilan-energie" ref={ref} style={{ width: '100%', height: 220 }} />
      )}
    </div>
  );
}