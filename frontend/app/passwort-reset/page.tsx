"use client";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function PasswortResetPage() {
  const [email, setEmail] = useState("");
  const [gesendet, setGesendet] = useState(false);
  const [loading, setLoading] = useState(false);

  async function anfordern(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/auth/reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } finally {
      setLoading(false);
      setGesendet(true);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-lions-blue">Kunsttage 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Passwort zurücksetzen</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {gesendet ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-700 text-sm">
                Falls ein Konto mit dieser E-Mail-Adresse existiert, haben Sie soeben einen
                Reset-Link erhalten. Bitte prüfen Sie Ihr Postfach.
              </p>
              <p className="text-gray-400 text-xs">Der Link ist 2 Stunden gültig.</p>
              <Link href="/admin/login" className="text-sm text-lions-blue hover:underline">
                Zurück zur Anmeldung
              </Link>
            </div>
          ) : (
            <form onSubmit={anfordern} className="space-y-5">
              <p className="text-sm text-gray-600">
                Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen Ihres Passworts.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-lions-blue text-white py-2.5 rounded-md font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sende…" : "Reset-Link anfordern"}
              </button>
              <div className="text-center">
                <Link href="/admin/login" className="text-sm text-gray-500 hover:text-lions-blue">
                  Zurück zur Anmeldung
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
