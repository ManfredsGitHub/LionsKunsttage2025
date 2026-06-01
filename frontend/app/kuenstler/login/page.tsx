"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyToken, loginLinkAnfordern } from "@/lib/api";
import { Suspense } from "react";

function LinkAnfordern() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"" | "laden" | "ok" | "fehler">("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("laden");
    try {
      await loginLinkAnfordern(email);
      setStatus("ok");
    } catch {
      setStatus("fehler");
    }
  }

  if (status === "ok")
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm text-center">
        Falls Ihre E-Mail im System hinterlegt ist, erhalten Sie gleich einen neuen Link.
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <p className="text-sm text-gray-600 font-medium">Neuen Link anfordern</p>
      <input
        type="email" required value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Ihre E-Mail-Adresse"
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue"
        autoFocus
      />
      {status === "fehler" && <p className="text-red-600 text-xs">Fehler beim Senden — bitte versuchen Sie es erneut.</p>}
      <button type="submit" disabled={status === "laden"}
        className="w-full bg-lions-blue text-white py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
        {status === "laden" ? "Wird gesendet…" : "Login-Link zusenden"}
      </button>
    </form>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"pruefen" | "ok" | "kein_token" | "fehler">("pruefen");

  useEffect(() => {
    if (!token) { setStatus("kein_token"); return; }
    verifyToken(token)
      .then(({ kuenstler_id, name }) => {
        localStorage.setItem("kuenstler_id", String(kuenstler_id));
        localStorage.setItem("kuenstler_name", name);
        setStatus("ok");
        setTimeout(() => router.push("/kuenstler/portal"), 1500);
      })
      .catch(() => setStatus("fehler"));
  }, [token]);

  if (status === "pruefen")
    return <p className="text-gray-500 animate-pulse">Login wird geprüft…</p>;

  if (status === "ok")
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center text-green-800">
        Login erfolgreich. Sie werden weitergeleitet…
      </div>
    );

  if (status === "kein_token")
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-5 text-blue-800 space-y-1">
          <p className="font-semibold">Künstler-Portal</p>
          <p className="text-sm">Der Zugang erfolgt über Ihren persönlichen Einladungslink (48h gültig).</p>
          <p className="text-sm">Haben Sie bereits ein Konto? Fordern Sie hier einen neuen Link an:</p>
        </div>
        <LinkAnfordern />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-md p-5 text-red-800 space-y-1">
        <p className="font-semibold">Link abgelaufen.</p>
        <p className="text-sm">Einladungslinks sind 48 Stunden gültig. Fordern Sie hier einen neuen an:</p>
      </div>
      <LinkAnfordern />
    </div>
  );
}

export default function KuenstlerLoginPage() {
  return (
    <div className="max-w-md mx-auto pt-16">
      <h1 className="text-2xl font-bold text-lions-blue mb-8 text-center">Künstler-Portal</h1>
      <Suspense fallback={<p className="text-gray-400 animate-pulse">Laden…</p>}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
