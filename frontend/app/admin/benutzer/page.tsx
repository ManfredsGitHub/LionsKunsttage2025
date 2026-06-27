"use client";
import { useState, useEffect, useCallback } from "react";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Nutzer {
  id: number;
  email: string;
  rolle: string;
  aktiv: boolean;
  erstellt_am: string;
  letzter_login: string | null;
  kuenstler_id: number | null;
}

const ROLLEN = ["admin", "orga", "kasse", "kuenstler"] as const;
const ROLLEN_DE: Record<string, string> = {
  admin: "Admin",
  orga: "Orga-Team",
  kasse: "Kasse",
  kuenstler: "Künstler",
};
const ROLLEN_FARBE: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  orga: "bg-blue-100 text-blue-700",
  kasse: "bg-green-100 text-green-700",
  kuenstler: "bg-purple-100 text-purple-700",
};

export default function BenutzerPage() {
  const [nutzer, setNutzer] = useState<Nutzer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState("");
  const [neuEmail, setNeuEmail] = useState("");
  const [neuRolle, setNeuRolle] = useState<string>("orga");
  const [anlegen, setAnlegen] = useState(false);
  const [anlegenLoading, setAnlegenLoading] = useState(false);
  const [erfolg, setErfolg] = useState("");

  const laden = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/admin/users`, { headers: authHeaders() });
      if (resp.ok) setNutzer(await resp.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { laden(); }, [laden]);

  async function nutzerAnlegen(e: React.FormEvent) {
    e.preventDefault();
    setAnlegenLoading(true);
    setFehler("");
    try {
      const resp = await fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: neuEmail.trim().toLowerCase(), rolle: neuRolle }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setFehler(err.detail ?? "Fehler beim Anlegen");
        return;
      }
      setNeuEmail("");
      setAnlegen(false);
      setErfolg("Einladung gesendet.");
      setTimeout(() => setErfolg(""), 3000);
      laden();
    } finally {
      setAnlegenLoading(false);
    }
  }

  async function einladen(id: number) {
    await fetch(`${API}/admin/users/${id}/einladen`, {
      method: "POST",
      headers: authHeaders(),
    });
    setErfolg("Einladung erneut gesendet.");
    setTimeout(() => setErfolg(""), 3000);
  }

  async function aktivToggle(n: Nutzer) {
    await fetch(`${API}/admin/users/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ aktiv: !n.aktiv }),
    });
    laden();
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Benutzerverwaltung</h1>
          <p className="text-sm text-gray-500 mt-0.5">{nutzer.length} Konten</p>
        </div>
        <button
          onClick={() => setAnlegen(v => !v)}
          className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 transition-colors"
        >
          + Nutzer anlegen
        </button>
      </div>

      {erfolg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          {erfolg}
        </div>
      )}

      {/* Formular: Neuen Nutzer anlegen */}
      {anlegen && (
        <form onSubmit={nutzerAnlegen} className="mb-6 bg-white border rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Neuen Nutzer einladen</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail-Adresse</label>
              <input
                type="email"
                value={neuEmail}
                onChange={e => setNeuEmail(e.target.value)}
                required
                autoFocus
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
              <select
                value={neuRolle}
                onChange={e => setNeuRolle(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
              >
                {ROLLEN.map(r => (
                  <option key={r} value={r}>{ROLLEN_DE[r]}</option>
                ))}
              </select>
            </div>
          </div>
          {fehler && <p className="text-sm text-red-600">{fehler}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={anlegenLoading || !neuEmail}
              className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {anlegenLoading ? "Anlegen…" : "Anlegen & Einladung senden"}
            </button>
            <button
              type="button"
              onClick={() => { setAnlegen(false); setFehler(""); }}
              className="px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Tabelle */}
      {loading ? (
        <p className="text-sm text-gray-400">Lade…</p>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">E-Mail</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Letzter Login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {nutzer.map(n => (
                <tr key={n.id} className={n.aktiv ? "" : "opacity-50"}>
                  <td className="px-4 py-3 text-gray-800">{n.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLLEN_FARBE[n.rolle] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLLEN_DE[n.rolle] ?? n.rolle}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {n.aktiv ? (
                      <span className="text-green-600 text-xs font-medium">Aktiv</span>
                    ) : (
                      <span className="text-gray-400 text-xs font-medium">Inaktiv</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmt(n.letzter_login)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => einladen(n.id)}
                        className="text-xs text-lions-blue hover:underline"
                        title="Einladung erneut senden"
                      >
                        Einladen
                      </button>
                      <button
                        onClick={() => aktivToggle(n)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        {n.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {nutzer.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                    Noch keine Nutzer angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
