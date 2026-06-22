"use client";
import { useEffect, useState } from "react";
import { Bild } from "@/lib/types";
import { merkliste_admin_zusenden, merklisten_nachfassen } from "@/lib/api";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

interface BesucherMerkliste {
  id: number;
  email: string | null;
  telefon: string | null;
  erstellt_am: string;
  anzahl: number;
  bilder: Bild[];
}

export default function AdminMerklistenPage() {
  const [daten, setDaten] = useState<BesucherMerkliste[]>([]);
  const [laden, setLaden] = useState(true);
  const [offen, setOffen] = useState<Set<number>>(new Set());
  const [senden, setSenden] = useState<Record<number, "laden" | "ok" | "fehler">>({});
  const [nachfass, setNachfass] = useState({ betreff: "", text: "" });
  const [nachfassStatus, setNachfassStatus] = useState<"" | "laden" | "ok" | "fehler">("");

  useEffect(() => {
    fetch(`${API}/admin/merklisten`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setDaten(Array.isArray(d) ? d : []))
      .finally(() => setLaden(false));
  }, []);

  const empfaengerMitMerkliste = daten.filter(b => b.email && b.anzahl > 0).length;

  async function nachfassSenden(e: React.FormEvent) {
    e.preventDefault();
    setNachfassStatus("laden");
    try {
      await merklisten_nachfassen(nachfass.betreff, nachfass.text);
      setNachfassStatus("ok");
    } catch {
      setNachfassStatus("fehler");
    }
  }

  async function emailSenden(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setSenden(prev => ({ ...prev, [id]: "laden" }));
    try {
      await merkliste_admin_zusenden(id);
      setSenden(prev => ({ ...prev, [id]: "ok" }));
      setTimeout(() => setSenden(prev => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    } catch {
      setSenden(prev => ({ ...prev, [id]: "fehler" }));
      setTimeout(() => setSenden(prev => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    }
  }

  function toggle(id: number) {
    setOffen(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const gesamtFavoriten = daten.reduce((s, b) => s + b.anzahl, 0);

  // Beliebteste Bilder ermitteln
  const bildHits: Record<number, { bild: Bild; count: number }> = {};
  for (const b of daten) {
    for (const bild of b.bilder) {
      if (!bildHits[bild.id]) bildHits[bild.id] = { bild, count: 0 };
      bildHits[bild.id].count++;
    }
  }
  const top = Object.values(bildHits)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-lions-blue">Besucher-Merklisten</h1>

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Besucher registriert", wert: daten.length },
          { label: "Favoriten gesamt", wert: gesamtFavoriten },
          { label: "Ø Werke je Besucher", wert: daten.length ? (gesamtFavoriten / daten.length).toFixed(1) : "—" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-lions-blue">{k.wert}</div>
            <div className="text-sm text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Nachfass-Email */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Nachfass-Email</h2>
        <p className="text-xs text-gray-400 mb-4">
          Geht an <strong>{empfaengerMitMerkliste} Empfänger</strong> mit Merkliste (per BCC)
        </p>
        {nachfassStatus === "ok" ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm text-center">
            ✓ Email an {empfaengerMitMerkliste} Empfänger gesendet.
            <button onClick={() => setNachfassStatus("")} className="ml-3 underline text-xs">Neue Email</button>
          </div>
        ) : (
          <form onSubmit={nachfassSenden} className="space-y-3">
            <input
              type="text" required placeholder="Betreff"
              value={nachfass.betreff}
              onChange={e => setNachfass(p => ({ ...p, betreff: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
            />
            <textarea
              required placeholder="Emailtext…" rows={6}
              value={nachfass.text}
              onChange={e => setNachfass(p => ({ ...p, text: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue resize-y"
            />
            {nachfassStatus === "fehler" && (
              <p className="text-red-600 text-xs">Fehler beim Senden — bitte erneut versuchen.</p>
            )}
            <button type="submit" disabled={nachfassStatus === "laden" || empfaengerMitMerkliste === 0}
              className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
              {nachfassStatus === "laden" ? "Wird gesendet…" : `✉ An ${empfaengerMitMerkliste} Empfänger senden`}
            </button>
          </form>
        )}
      </div>

      {/* Top-Werke */}
      {top.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Beliebteste Werke</h2>
          <div className="space-y-2">
            {top.map(({ bild, count }) => (
              <div key={bild.id} className="flex items-center gap-3">
                {bild.bild_url_web && (
                  <img src={`${API}${bild.bild_url_web}`} alt=""
                    className="w-10 h-10 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{bild.bildtitel}</span>
                  {bild.kuenstler && (
                    <span className="text-xs text-gray-400 ml-2">
                      {bild.kuenstler.db_vorname} {bild.kuenstler.db_name}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-lions-blue flex-shrink-0">
                  {count}× gemerkt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Besucher-Tabelle */}
      {daten.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Noch keine Merklisten angelegt.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Kontakt</th>
                <th className="px-4 py-3 text-left">Registriert</th>
                <th className="px-4 py-3 text-center">Werke</th>
                <th className="px-4 py-3 text-center">Aktion</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {daten.map(b => (
                <>
                  <tr key={b.id}
                    onClick={() => b.anzahl > 0 && toggle(b.id)}
                    className={`transition-colors ${b.anzahl > 0 ? "cursor-pointer hover:bg-gray-50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">
                        {b.email ?? b.telefon ?? "—"}
                      </span>
                      {b.email && b.telefon && (
                        <span className="text-xs text-gray-400 ml-2">{b.telefon}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(b.erstellt_am).toLocaleDateString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        b.anzahl > 0 ? "bg-lions-blue/10 text-lions-blue" : "bg-gray-100 text-gray-400"
                      }`}>
                        {b.anzahl}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      {b.email && b.anzahl > 0 && (
                        <button
                          onClick={e => emailSenden(e, b.id)}
                          disabled={senden[b.id] === "laden"}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            senden[b.id] === "ok"
                              ? "bg-green-100 text-green-700"
                              : senden[b.id] === "fehler"
                              ? "bg-red-100 text-red-700"
                              : "bg-lions-blue/10 text-lions-blue hover:bg-lions-blue hover:text-white disabled:opacity-50"
                          }`}
                        >
                          {senden[b.id] === "laden" ? "Wird gesendet…"
                            : senden[b.id] === "ok" ? "✓ Gesendet"
                            : senden[b.id] === "fehler" ? "Fehler"
                            : "✉ Senden"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-center">
                      {b.anzahl > 0 && (
                        <span className="text-xs">{offen.has(b.id) ? "▲" : "▼"}</span>
                      )}
                    </td>
                  </tr>
                  {offen.has(b.id) && (
                    <tr key={`${b.id}-detail`}>
                      <td colSpan={5} className="bg-gray-50 px-4 py-3">
                        <div className="space-y-2">
                          {b.bilder.map(bild => (
                            <div key={bild.id} className="flex items-center gap-3">
                              {bild.bild_url_web ? (
                                <img src={`${API}${bild.bild_url_web}`} alt=""
                                  className="w-10 h-10 object-cover rounded flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <a href={`/bilder/${bild.id}`} target="_blank"
                                  className="text-sm font-medium text-gray-800 hover:text-lions-blue">
                                  {bild.bildtitel}
                                </a>
                                {bild.kuenstler && (
                                  <span className="text-xs text-gray-400 ml-2">
                                    {bild.kuenstler.db_vorname} {bild.kuenstler.db_name}
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                bild.verfuegbarkeit === "Verfügbar" ? "bg-green-100 text-green-700" :
                                bild.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>{bild.verfuegbarkeit}</span>
                              {bild.verkaufspreis && (
                                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                                  {bild.verkaufspreis.toFixed(0)} €
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
