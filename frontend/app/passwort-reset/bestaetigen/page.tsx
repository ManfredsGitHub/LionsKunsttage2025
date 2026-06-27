"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PasswortStaerke, { istPasswortValid } from "@/components/PasswortStaerke";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState("");
  const [loading, setLoading] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!token) setFehler("Kein gültiger Token in der URL.");
  }, [token]);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (pw1 !== pw2) { setFehler("Passwörter stimmen nicht überein."); return; }
    if (!istPasswortValid(pw1)) { setFehler("Passwort erfüllt nicht alle Anforderungen."); return; }
    setFehler("");
    setLoading(true);
    try {
      const resp = await fetch(`${API}/auth/reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, neues_passwort: pw1 }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const detail = err.detail;
        setFehler(Array.isArray(detail) ? detail.join(" · ") : (detail ?? "Fehler beim Zurücksetzen"));
        return;
      }
      setErfolg(true);
      setTimeout(() => router.push("/admin/login"), 2500);
    } catch {
      setFehler("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }

  if (erfolg) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-700 text-sm font-medium">Passwort erfolgreich geändert.</p>
        <p className="text-gray-400 text-xs">Sie werden zur Anmeldung weitergeleitet…</p>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="space-y-5">
      <p className="text-sm text-gray-600">Legen Sie Ihr neues Passwort fest.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
        <input
          type="password"
          value={pw1}
          onChange={e => setPw1(e.target.value)}
          autoFocus
          required
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
        />
        <PasswortStaerke passwort={pw1} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
        <input
          type="password"
          value={pw2}
          onChange={e => setPw2(e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
        />
        {pw2 && pw1 !== pw2 && (
          <p className="text-xs text-red-500 mt-1">Passwörter stimmen nicht überein.</p>
        )}
      </div>

      {fehler && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !istPasswortValid(pw1) || pw1 !== pw2}
        className="w-full bg-lions-blue text-white py-2.5 rounded-md font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "Speichere…" : "Passwort speichern"}
      </button>
    </form>
  );
}

export default function ResetBestaetigenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-lions-blue">Kunsttage 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Neues Passwort festlegen</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <Suspense fallback={<p className="text-sm text-gray-500">Lade…</p>}>
            <ResetForm />
          </Suspense>
        </div>
        <div className="text-center mt-4">
          <Link href="/admin/login" className="text-sm text-gray-500 hover:text-lions-blue">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
}
