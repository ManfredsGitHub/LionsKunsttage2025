"use client";
import { useState } from "react";
import { authHeaders } from "@/lib/auth";
import PasswortStaerke, { istPasswortValid } from "@/components/PasswortStaerke";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function AugeIcon({ offen }: { offen: boolean }) {
  return offen ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  );
}

function PasswortFeld({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [sichtbar, setSichtbar] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={sichtbar ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
        />
        <button
          type="button"
          onClick={() => setSichtbar(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        >
          <AugeIcon offen={sichtbar} />
        </button>
      </div>
    </div>
  );
}

export default function EinstellungenPage() {
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [bestaetigung, setBestaetigung] = useState("");
  const [status, setStatus] = useState<"" | "laden" | "ok" | "fehler">("");
  const [meldung, setMeldung] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (neu !== bestaetigung) {
      setMeldung("Neues Passwort und Bestätigung stimmen nicht überein.");
      setStatus("fehler");
      return;
    }
    if (!istPasswortValid(neu)) {
      setMeldung("Das neue Passwort erfüllt nicht alle Anforderungen.");
      setStatus("fehler");
      return;
    }
    setStatus("laden");
    setMeldung("");
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ altes_passwort: alt, neues_passwort: neu }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail;
        setMeldung(Array.isArray(detail) ? detail.join(" · ") : (detail ?? "Fehler beim Ändern"));
        setStatus("fehler");
        return;
      }
      setStatus("ok");
      setMeldung("Passwort erfolgreich geändert.");
      setAlt(""); setNeu(""); setBestaetigung("");
    } catch {
      setMeldung("Server nicht erreichbar.");
      setStatus("fehler");
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-lions-blue mb-6">Einstellungen</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-lions-blue mb-4">Mein Passwort ändern</h2>
        <form onSubmit={submit} className="space-y-4">
          <PasswortFeld
            label="Aktuelles Passwort"
            value={alt}
            onChange={setAlt}
            autoComplete="current-password"
          />
          <div>
            <PasswortFeld
              label="Neues Passwort"
              value={neu}
              onChange={setNeu}
              autoComplete="new-password"
            />
            <PasswortStaerke passwort={neu} />
          </div>
          <PasswortFeld
            label="Neues Passwort bestätigen"
            value={bestaetigung}
            onChange={setBestaetigung}
            autoComplete="new-password"
          />
          {bestaetigung && neu !== bestaetigung && (
            <p className="text-xs text-red-500">Passwörter stimmen nicht überein.</p>
          )}

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
            disabled={status === "laden" || !alt || !istPasswortValid(neu) || neu !== bestaetigung}
            className="bg-lions-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {status === "laden" ? "Wird geändert…" : "Passwort ändern"}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Das neue Passwort ist sofort wirksam. Laufende Sessions bleiben bis zum Ablauf gültig.
      </p>
    </div>
  );
}
