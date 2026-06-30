"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AbmeldenInhalt() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"laden" | "ok" | "fehler">("laden");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("fehler");
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/merkliste/abmelden?token=${encodeURIComponent(token)}`, {
      method: "POST",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        setEmail(data.email ?? "");
        setStatus("ok");
      })
      .catch(() => setStatus("fehler"));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-sm max-w-md w-full p-8 text-center">
        {status === "laden" && (
          <p className="text-gray-500 animate-pulse">Einen Moment…</p>
        )}
        {status === "ok" && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Abgemeldet</h1>
            <p className="text-gray-600 text-sm mb-6">
              {email ? (
                <><strong>{email}</strong> erhält keine weiteren E-Mails von den Kunsttagen.</>
              ) : (
                "Sie erhalten keine weiteren E-Mails von den Kunsttagen."
              )}
            </p>
            <Link href="/" className="text-sm text-lions-blue hover:underline">
              Zur Startseite
            </Link>
          </>
        )}
        {status === "fehler" && (
          <>
            <div className="text-4xl mb-4">✕</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link ungültig</h1>
            <p className="text-gray-600 text-sm mb-6">
              Der Abmelde-Link ist nicht mehr gültig oder wurde bereits verwendet.
            </p>
            <Link href="/" className="text-sm text-lions-blue hover:underline">
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function AbmeldenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse">Einen Moment…</p>
      </div>
    }>
      <AbmeldenInhalt />
    </Suspense>
  );
}
