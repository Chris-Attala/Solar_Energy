/**
 * Nombres au format français (espaces milliers, virgule décimale) — KPI & textes.
 * Aligné sur Intl fr-FR (souvent espace fine U+202F entre groupes de 3 chiffres).
 */

const frInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fr1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fr2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatFrInt(n: number): string {
  return frInt.format(Math.round(n));
}

export function formatFr1(n: number): string {
  return fr1.format(n);
}

export function formatFr2(n: number): string {
  return fr2.format(n);
}
