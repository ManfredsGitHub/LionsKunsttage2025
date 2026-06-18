"use client";
import { useState } from "react";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Rolle = "admin" | "orga";
type Status = "" | "laden" | "ok" | "fehler";

function PasswortForm({ rolle, titel }: { rolle: Rolle; titel: string }) {
  const [form, setForm] = useState({ alt: "", neu: "", bestaetigung: "" });
  const [status, setStatus] = useState<Status>("");
  const [meldung, setMeldung] = useState("");

  function setField(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.neu !== form.bestaetigung) {
      setMeldung("Neues Passwort und Bestätigung stimmen nicht überein.");
      setStatus("fehler");
      return;
    }
    if (form.neu.length < 8) {
      setMeldung("Neues Passwort muss mindestens 8 Zeichen haben.");
      setStatus("fehler");
      return;
    }
    setStatus("laden");
    setMeldung("");
    try {
      const res = await fetch(`${API}/admin/passwort`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ rolle, altes_passwort: form.alt, neues_passwort: form.neu }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMeldung(err.detail ?? "Fehler beim Ändern");
        setStatus("fehler");
        return;
      }
      setStatus("ok");
      setMeldung("Passwort erfolgreich geändert.");
      setForm({ alt: "", neu: "", bestaetigung: "" });
    } catch {
      setMeldung("Server nicht erreichbar.");
      setStatus("fehler");
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-base font-semibold text-lions-blue mb-4">{titel}</h2>
      <form onSubmit={submit} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aktuelles Passwort
          </label>
          <input
            type="password"
            value={form.alt}
            onChange={e => setField("alt", e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Neues Passwort
          </label>
          <input
            type="password"
            value={form.neu}
            onChange={e => setField("neu", e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
          />
          <p className="text-xs text-gray-400 mt-1">Mindestens 8 Zeichen</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Neues Passwort bestätigen
          </label>
          <input
            type="password"
            value={form.bestaetigung}
            onChange={e => setField("bestaetigung", e.target.value)}
            required
            autoComplete="new-password"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
          />
        </div>

        {meldung && (
          <p className={`text-sm rounded-md px-3 py-2 ${
            status === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}>
            {meldung}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "laden" || !form.alt || !form.neu || !form.bestaetigung}
          className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
        >
          {status === "laden" ? "Wird geändert…" : "Passwort ändern"}
        </button>
      </form>
    </div>
  );
}

export default function EinstellungenPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-lions-blue mb-6">Einstellungen</h1>

      <div className="space-y-6">
        <PasswortForm rolle="admin" titel="Admin-Passwort ändern" />
        <PasswortForm rolle="orga" titel="Orga-Team-Passwort ändern" />
      </div>

      <p className="text-xs text-gray-400 mt-8">
        Passwörter werden sofort wirksam — laufende Sessions bleiben gültig bis zum Ablauf.
      </p>
    </div>
  );
}
