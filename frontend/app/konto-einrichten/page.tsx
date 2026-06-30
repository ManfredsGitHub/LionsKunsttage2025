"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PasswortStaerke, { istPasswortValid } from "@/components/PasswortStaerke";
import { setToken, redirectNachRolle, type Rolle } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ROLLEN_DE: Record<string, string> = {
  admin: "Administrator",
  orga: "Orga-Team",
  kasse: "Kasse",
  kuenstler: "Künstler-Portal",
};

function SetupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenFehler, setTokenFehler] = useState(false);

  useEffect(() => {
    if (!token) { setTokenFehler(true); return; }
    fetch(`${API}/auth/setup/verify?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setEmail(data.email); setRolle(data.rolle); })
      .catch(() => setTokenFehler(true));
  }, [token]);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (pw1 !== pw2) { setFehler("Passwörter stimmen nicht überein."); return; }
    if (!istPasswortValid(pw1)) { setFehler("Passwort erfüllt nicht alle Anforderungen."); return; }
    setFehler("");
    setLoading(true);
    try {
      const resp = await fetch(`${API}/auth/setup-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, neues_passwort: pw1 }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const detail = err.detail;
        setFehler(Array.isArray(detail) ? detail.join(" · ") : (detail ?? "Fehler beim Einrichten"));
        return;
      }
      const { token: jwt, stunden, rolle: r } = await resp.json();
      await setToken(jwt, stunden);
      router.push(redirectNachRolle(r as Rolle));
    } catch {
      setFehler("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }

  if (tokenFehler) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 text-sm font-medium">
          Dieser Einladungslink ist ungültig oder abgelaufen.
        </p>
        <p className="text-gray-500 text-sm">Bitte wenden Sie sich an den Administrator.</p>
        <Link href="/admin/login" className="text-sm text-lions-blue hover:underline">
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  if (!email) {
    return <p className="text-sm text-gray-500 text-center">Prüfe Einladungslink…</p>;
  }

  return (
    <form onSubmit={absenden} className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2.5">
        <p className="text-xs text-gray-500 mb-0.5">Konto für</p>
        <p className="text-sm font-medium text-gray-800">{email}</p>
        <p className="text-xs text-lions-blue mt-0.5">{ROLLEN_DE[rolle] ?? rolle}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passwort festlegen</label>
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
        {loading ? "Einrichten…" : "Konto einrichten & anmelden"}
      </button>
    </form>
  );
}

export default function KontoEinrichtenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-lions-blue">Kunsttage 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Konto einrichten</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <Suspense fallback={<p className="text-sm text-gray-500 text-center">Lade…</p>}>
            <SetupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
