"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminDatenschutzPage() {
  const [text, setText] = useState("");
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    fetch(`${API}/einstellungen/datenschutz`)
      .then(r => r.json())
      .then(d => { setText(d.text); setLaden(false); })
      .catch(() => setLaden(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSpeichern(true); setFehler(""); setGespeichert(false);
    try {
      const r = await fetch(`${API}/admin/einstellungen/datenschutz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(await r.text());
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 3000);
    } catch (err: any) {
      setFehler(err.message);
    } finally {
      setSpeichern(false);
    }
  }

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lions-blue">Datenschutzerklärung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Öffentlich sichtbar unter{" "}
            <a href="/datenschutz" target="_blank" className="text-lions-blue hover:underline">
              /datenschutz
            </a>
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
        Bitte ersetzen Sie alle Stellen in <strong>[eckigen Klammern]</strong> mit den tatsächlichen Angaben des Vereins.
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-xl shadow-sm p-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={36}
            className="w-full px-4 py-3 text-sm font-mono text-gray-700 leading-relaxed resize-none focus:outline-none rounded-xl"
            placeholder="Datenschutzerklärung eingeben…"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={speichern}
            className="px-5 py-2 bg-lions-blue text-white text-sm font-medium rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {speichern ? "Wird gespeichert…" : "Speichern"}
          </button>
          {gespeichert && <span className="text-green-600 text-sm">✓ Gespeichert</span>}
          {fehler && <span className="text-red-600 text-sm">{fehler}</span>}
          <a
            href="/datenschutz"
            target="_blank"
            className="text-sm text-gray-500 hover:text-lions-blue ml-auto"
          >
            Vorschau öffnen →
          </a>
        </div>
      </form>
    </div>
  );
}
