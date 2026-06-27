"use client";

export interface PasswortPruefung {
  laenge: boolean;
  grossbuchstabe: boolean;
  ziffer: boolean;
  sonderzeichen: boolean;
}

export function pruefePasswort(pw: string): PasswortPruefung {
  return {
    laenge: pw.length >= 10,
    grossbuchstabe: /[A-Z]/.test(pw),
    ziffer: /[0-9]/.test(pw),
    sonderzeichen: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(pw),
  };
}

export function istPasswortValid(pw: string): boolean {
  const p = pruefePasswort(pw);
  return p.laenge && p.grossbuchstabe && p.ziffer && p.sonderzeichen;
}

interface Props {
  passwort: string;
}

const KRITERIEN: { key: keyof PasswortPruefung; label: string }[] = [
  { key: "laenge", label: "Mindestens 10 Zeichen" },
  { key: "grossbuchstabe", label: "Mindestens 1 Großbuchstabe" },
  { key: "ziffer", label: "Mindestens 1 Ziffer" },
  { key: "sonderzeichen", label: "Mindestens 1 Sonderzeichen (!@#$ ...)" },
];

export default function PasswortStaerke({ passwort }: Props) {
  if (!passwort) return null;

  const pruefung = pruefePasswort(passwort);
  const erfuellt = Object.values(pruefung).filter(Boolean).length;

  const staerke = erfuellt === 4 ? "Stark" : erfuellt === 3 ? "Gut" : erfuellt === 2 ? "Mittel" : "Schwach";
  const farbe = erfuellt === 4 ? "bg-green-500" : erfuellt === 3 ? "bg-yellow-400" : erfuellt === 2 ? "bg-orange-400" : "bg-red-400";
  const textfarbe = erfuellt === 4 ? "text-green-700" : erfuellt === 3 ? "text-yellow-700" : erfuellt === 2 ? "text-orange-700" : "text-red-600";

  return (
    <div className="mt-2 space-y-2">
      {/* Balken */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= erfuellt ? farbe : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textfarbe}`}>{staerke}</p>

      {/* Checkliste */}
      <ul className="space-y-0.5">
        {KRITERIEN.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-1.5 text-xs">
            {pruefung[key] ? (
              <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            <span className={pruefung[key] ? "text-gray-500" : "text-gray-400"}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
