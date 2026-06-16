/** Formatiert eine 7-stellige Bild-Nr. als JJ.KKK.NN (z. B. "2540001" → "25.400.01"). */
export function formatBildNr(nr: string): string {
  const d = nr.replace(/\D/g, "");
  if (d.length === 7) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 7)}`;
  return nr;
}
