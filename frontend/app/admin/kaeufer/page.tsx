"use client";
import { useEffect, useState } from "react";
import { getAlleKaeufer } from "@/lib/api";
import { KaeuferEintrag, KaeuferKauf } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

export default function KaeuferPage() {
  const [kaeufer, setKaeufer] = useState<KaeuferEintrag[]>([]);
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState("");
  const [offen, setOffen] = useState<string | null>(null);

  useEffect(() => {
    getAlleKaeufer().then(setKaeufer).finally(() => setLaden(false));
  }, []);

  const gefiltert = kaeufer.filter(k => {
    const s = suche.toLowerCase();
    return !s ||
      k.name.toLowerCase().includes(s) ||
      k.vorname.toLowerCase().includes(s) ||
      k.email.toLowerCase().includes(s) ||
      k.ort.toLowerCase().includes(s);
  });

  const gesamtUmsatz = kaeufer.reduce((s, k) => s + k.gesamt, 0);

  if (laden) return <p className="p-8 text-gray-400">Laden…</p>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b sticky top-0 z-10">
        <div className="flex-1">
          <h1 className="font-bold text-lions-blue">Käufer</h1>
          <p className="text-xs text-gray-400">
            {kaeufer.length} Käufer · {gesamtUmsatz.toLocaleString("de-DE")} € Gesamtumsatz
          </p>
        </div>
        <input
          type="search"
          placeholder="Name, E-Mail oder Ort…"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue w-64"
        />
      </div>

      <div className="p-6">
        {gefiltert.length === 0 ? (
          <p className="text-center text-gray-400 py-16">
            {kaeufer.length === 0 ? "Noch keine Käufer erfasst." : `Keine Treffer für „${suche}"`}
          </p>
        ) : (
          <div className="space-y-2">
            {gefiltert.map(k => {
              const key = k.email;
              const istOffen = offen === key;
              const name = [k.titel, k.vorname, k.name].filter(Boolean).join(" ");
              return (
                <div key={key} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Kopfzeile */}
                  <button
                    onClick={() => setOffen(istOffen ? null : key)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="font-semibold text-gray-800">{name}</span>
                        <span className="text-sm text-gray-400">{k.email}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {k.strasse} · {k.plz} {k.ort}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-lions-blue">
                        {k.gesamt.toLocaleString("de-DE")} €
                      </div>
                      <div className="text-xs text-gray-400">
                        {k.kaeufe.length} {k.kaeufe.length === 1 ? "Kauf" : "Käufe"}
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm ml-2">
                      {istOffen ? "▲" : "▼"}
                    </div>
                  </button>

                  {/* Detail */}
                  {istOffen && (
                    <div className="border-t bg-gray-50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b">
                            <th className="px-5 py-2 text-left font-medium">Datum</th>
                            <th className="px-5 py-2 text-left font-medium">Bild</th>
                            <th className="px-5 py-2 text-left font-medium">Künstler</th>
                            <th className="px-5 py-2 text-left font-medium">Zahlung</th>
                            <th className="px-5 py-2 text-right font-medium">Preis</th>
                            <th className="px-5 py-2 text-left font-medium">Status</th>
                            <th className="px-5 py-2 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {k.kaeufe.map((kauf: KaeuferKauf) => (
                            <tr key={kauf.kauf_id} className="hover:bg-white">
                              <td className="px-5 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">
                                {new Date(kauf.datum).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              </td>
                              <td className="px-5 py-3">
                                <div className="font-medium text-gray-800 leading-tight">{kauf.bildtitel ?? "—"}</div>
                                {kauf.bild_nr && (
                                  <div className="font-mono text-xs text-gray-400">{formatBildNr(kauf.bild_nr)}</div>
                                )}
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-sm">{kauf.kuenstler ?? "—"}</td>
                              <td className="px-5 py-3 text-gray-500">{kauf.zahlungsart}</td>
                              <td className="px-5 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                                {kauf.verkaufspreis ? `${kauf.verkaufspreis.toLocaleString("de-DE")} €` : "—"}
                              </td>
                              <td className="px-5 py-3">
                                {kauf.bezahlt
                                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Bezahlt</span>
                                  : <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">Ausstehend</span>
                                }
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => window.open(`/admin/kaufuebersicht/${kauf.kauf_id}/quittung`, "_blank")}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                                >
                                  Quittung
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={4} className="px-5 py-2 text-xs text-gray-400">Gesamt</td>
                            <td className="px-5 py-2 text-right font-bold text-lions-blue">
                              {k.gesamt.toLocaleString("de-DE")} €
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
