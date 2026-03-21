/**
 * Clé calendaire Europe/Paris (YYYY-MM-DD), alignée sur Open-Meteo timezone=Europe/Paris.
 * Évite les décalages quand le navigateur n’est pas en France.
 */
export function dateToParisYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function parisTodayYmd(): string {
  return dateToParisYmd(new Date());
}
