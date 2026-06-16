"use client";
import { useEffect, useState } from "react";
import {
  besucher_newsletter_senden, nachricht_senden,
  getAlleNachrichten, getNachrichtUngelesen,
} from "@/lib/api";

type Nachricht = { id: number; betreff: string; text: string; erstellt_am: string; gelesen: number; gesamt: number };
type Ungelesen = { id: number; name: string; email: string };

function EmailForm({
  titel, hint, onSend,
}: {
  titel: string;
  hint: string;
  onSend: (betreff: string, text: string) => Promise<{ anzahl: number }>;
}) {
  const [form, setForm] = useState({ betreff: "", text: "" });
  const [status, setStatus] = useState<"" | "laden" | "ok" | "fehler">("");
  const [anzahl, setAnzahl] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("laden");
    try {
      const r = await onSend(form.betreff, form.text);
      setAnzahl(r.anzahl);
      setStatus("ok");
    } catch {
      setStatus("fehler");
    }
  }

  if (status === "ok")
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm text-center">
        ✓ Gesendet an {anzahl} Empfänger.
        <button onClick={() => { setStatus(""); setForm({ betreff: "", text: "" }); }}
          className="ml-3 underline text-xs">Neue Email</button>
      </div>
    );

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-1">{titel}</h2>
      <p className="text-xs text-gray-400 mb-3">{hint}</p>
      <form onSubmit={submit} className="space-y-3">
        <input type="text" required placeholder="Betreff"
          value={form.betreff} onChange={e => setForm(p => ({ ...p, betreff: e.target.value }))}
          className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
        <textarea required placeholder="Emailtext…" rows={6}
          value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue resize-y" />
        {status === "fehler" && <p className="text-red-600 text-xs">Fehler beim Senden.</p>}
        <button type="submit" disabled={status === "laden"}
          className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
          {status === "laden" ? "Wird gesendet…" : "✉ Senden"}
        </button>
      </form>
    </div>
  );
}

export default function AdminNachrichtenPage() {
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [ungelesen, setUngelesen] = useState<Record<number, Ungelesen[]>>({});
  const [offen, setOffen] = useState<number | null>(null);

  useEffect(() => {
    getAlleNachrichten().then(setNachrichten).catch(() => {});
  }, []);

  async function handleKuenstlerSenden(betreff: string, text: string) {
    const r = await nachricht_senden(betreff, text);
    const neu = await getAlleNachrichten();
    setNachrichten(neu);
    return { anzahl: r.anzahl };
  }

  async function toggleUngelesen(id: number) {
    if (offen === id) { setOffen(null); return; }
    setOffen(id);
    if (!ungelesen[id]) {
      const liste = await getNachrichtUngelesen(id);
      setUngelesen(prev => ({ ...prev, [id]: liste }));
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-lions-blue">Kommunikation</h1>

      {/* Besucher-Newsletter */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <EmailForm
          titel="Besucher-Newsletter"
          hint="BCC an alle registrierten Besucher mit E-Mail-Adresse"
          onSend={(b, t) => besucher_newsletter_senden(b, t)}
        />
      </div>

      {/* Künstler-Infos */}
      <div className="bg-white rounded-lg shadow-sm border p-5 space-y-5">
        <EmailForm
          titel="Info an ausstellende Künstler"
          hint="BCC an alle vor Ort anwesenden Künstler mit E-Mail — wird gespeichert und ist im Portal sichtbar"
          onSend={handleKuenstlerSenden}
        />

        {/* Gesendete Nachrichten */}
        {nachrichten.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3 border-t pt-4">Gesendete Nachrichten</h3>
            <div className="space-y-2">
              {nachrichten.map(n => (
                <div key={n.id} className="border rounded-md overflow-hidden">
                  <button
                    onClick={() => toggleUngelesen(n.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{n.betreff}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(n.erstellt_am).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        n.gelesen === n.gesamt && n.gesamt > 0
                          ? "bg-green-100 text-green-700"
                          : n.gelesen > 0
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {n.gelesen}/{n.gesamt} gelesen
                      </span>
                      <span className="text-gray-400 text-xs">{offen === n.id ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {offen === n.id && (
                    <div className="bg-gray-50 border-t px-4 py-3 space-y-3">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.text}</p>
                      {ungelesen[n.id] !== undefined && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Noch nicht gelesen ({ungelesen[n.id].length}):
                          </p>
                          {ungelesen[n.id].length === 0 ? (
                            <p className="text-xs text-green-600">Alle haben gelesen.</p>
                          ) : (
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {ungelesen[n.id].map(k => (
                                <li key={k.id}>{k.name} · {k.email}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
