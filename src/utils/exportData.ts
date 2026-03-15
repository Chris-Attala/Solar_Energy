import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EnergyData, KPIData, MonthlyProjection, SeasonalStats } from '../types/energy';
import { format } from 'date-fns';

export async function exportToExcel(
  data: EnergyData[], kpis: KPIData,
  monthly: MonthlyProjection[], seasonal: SeasonalStats[],
  price: number
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Sheet 1 – Raw data
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Date','Produit (kWh)','Consommé (kWh)','Exporté (kWh)','Importé (kWh)','Chargé (kWh)','Déchargé (kWh)'],
    ...data.map(d => [
      format(d.date, 'yyyy-MM-dd'),
      +d.produced.toFixed(3), +d.consumed.toFixed(3), +d.exported.toFixed(3),
      +d.imported.toFixed(3), +d.charged.toFixed(3),  +d.discharged.toFixed(3),
    ]),
  ]);
  ws1['!cols'] = Array(7).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws1, 'Données EMA');

  // Sheet 2 – KPIs
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Indicateur','Valeur','Unité'],
    ['Production totale',  +kpis.totalProduced.toFixed(2),   'kWh'],
    ['Autoconsommation',   +kpis.autoconsumption.toFixed(1), '%'],
    ['Autosuffisance',     +kpis.selfSufficiency.toFixed(1), '%'],
    ['Économies totales',  +kpis.totalSavings.toFixed(2),    '€'],
    ['Énergie exportée',   +kpis.totalExported.toFixed(2),   'kWh'],
    ['Énergie importée',   +kpis.totalImported.toFixed(2),   'kWh'],
    ['Solde net',          +kpis.netBalance.toFixed(2),      'kWh'],
    ['Prix kWh',           price,                            '€/kWh'],
  ]);
  ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'KPIs');

  // Sheet 3 – Monthly projections
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Mois','Production (kWh)','Autoconsommée (kWh)','Économies (€)'],
    ...monthly.map(m => [m.month, +m.production.toFixed(1), +m.selfConsumed.toFixed(1), +m.savings.toFixed(2)]),
    ['TOTAL',
      +monthly.reduce((s,m) => s+m.production, 0).toFixed(1),
      +monthly.reduce((s,m) => s+m.selfConsumed, 0).toFixed(1),
      +monthly.reduce((s,m) => s+m.savings, 0).toFixed(2)],
  ]);
  ws3['!cols'] = Array(4).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, ws3, 'Projections 12 mois');

  // Sheet 4 – Seasonal
  const ws4 = XLSX.utils.aoa_to_sheet([
    ['Saison','Jours','Prod. totale (kWh)','Moy/jour (kWh)','Autoconso. (%)','Autosuff. (%)','Économies (€)'],
    ...seasonal.map(s => [s.label, s.days, +s.totalProduction.toFixed(1),
      +s.avgDailyProduction.toFixed(2), +s.avgAutoconsumption.toFixed(1),
      +s.avgSelfSufficiency.toFixed(1), +s.savings.toFixed(2)]),
  ]);
  ws4['!cols'] = Array(7).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws4, 'Analyse saisonnière');

  XLSX.writeFile(wb, `EMA-Solar-Export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export async function exportToPDF(
  data: EnergyData[], kpis: KPIData,
  monthly: MonthlyProjection[], seasonal: SeasonalStats[],
  price: number, dateRange: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 18, W, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EMA Solar Dashboard', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandelieu-la-Napoule 06210 · 12 kWc · Tilt 30° · Azimut 210°', 14, 25);
  doc.text(`${format(new Date(), 'dd/MM/yyyy HH:mm')}  ·  ${dateRange}`, W - 14, 25, { align: 'right' });

  let y = 38;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs clés', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Production totale',  `${kpis.totalProduced.toFixed(1)} kWh`],
      ['Autoconsommation',   `${kpis.autoconsumption.toFixed(1)} %`],
      ['Autosuffisance',     `${kpis.selfSufficiency.toFixed(1)} %`],
      ['Économies totales',  `${kpis.totalSavings.toFixed(2)} €`],
      ['Énergie exportée',   `${kpis.totalExported.toFixed(1)} kWh`],
      ['Énergie importée',   `${kpis.totalImported.toFixed(1)} kWh`],
      ['Solde net',          `${kpis.netBalance.toFixed(1)} kWh`],
      ['Prix électricité',   `${price.toFixed(3)} €/kWh`],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Projections 12 mois', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Mois', 'Production (kWh)', 'Autoconsommée (kWh)', 'Économies (€)']],
    body: [
      ...monthly.map(m => [m.month, m.production.toFixed(0), m.selfConsumed.toFixed(0), m.savings.toFixed(0)]),
      ['TOTAL',
        monthly.reduce((s,m) => s+m.production, 0).toFixed(0),
        monthly.reduce((s,m) => s+m.selfConsumed, 0).toFixed(0),
        monthly.reduce((s,m) => s+m.savings, 0).toFixed(0)],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [245, 158, 11], textColor: 255 },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Analyse saisonnière', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Saison','Jours','Prod. totale','Moy/jour','Autoconso.','Autosuff.','Économies']],
    body: seasonal.map(s => [
      `${s.emoji} ${s.label}`, s.days,
      `${s.totalProduction.toFixed(0)} kWh`, `${s.avgDailyProduction.toFixed(1)} kWh`,
      `${s.avgAutoconsumption.toFixed(0)}%`, `${s.avgSelfSufficiency.toFixed(0)}%`,
      `${s.savings.toFixed(0)} €`,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [14, 165, 233], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: 14, right: 14 },
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`EMA Solar Dashboard · Mandelieu-la-Napoule · Page ${i}/${total}`, W / 2, 290, { align: 'center' });
  }

  doc.save(`EMA-Solar-Rapport-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
