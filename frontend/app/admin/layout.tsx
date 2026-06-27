"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getRolle, logout } from "@/lib/auth";

interface Crumb {
  label: string;
  href: string;
}

const CRUMBS: Record<string, Crumb[]> = {
  // Direkte Dashboard-Kinder
  "/admin/kuenstler":      [{ label: "Künstler anlegen & pflegen", href: "/admin/kuenstler" }],
  "/admin/bilder":         [{ label: "Bildverwaltung", href: "/admin/bilder" }],
  "/admin/merklisten":     [{ label: "Besucher-Merklisten", href: "/admin/merklisten" }],
  "/admin/kaufanfragen":   [{ label: "Kaufanfragen", href: "/admin/kaufanfragen" }],
  "/admin/kasse":          [{ label: "Vor-Ort-Kasse", href: "/admin/kasse" }],
  "/admin/kaeufer":        [{ label: "Käufer", href: "/admin/kaeufer" }],
  "/admin/kaufuebersicht": [{ label: "Kaufübersicht", href: "/admin/kaufuebersicht" }],
  "/admin/going-live":        [{ label: "Going Live", href: "/admin/going-live" }],
  "/admin/org-abwicklung":    [{ label: "Organisation und Abwicklung", href: "/admin/org-abwicklung" }],
  "/admin/nachrichten":    [{ label: "Kommunikation", href: "/admin/nachrichten" }],
  "/admin/benutzer":       [{ label: "Benutzerverwaltung", href: "/admin/benutzer" }],
  "/admin/einstellungen":  [{ label: "Einstellungen", href: "/admin/einstellungen" }],

  // Organisation
  "/admin/organisation":      [{ label: "Organisation", href: "/admin/organisation" }],
  "/admin/plaetze":           [{ label: "Organisation", href: "/admin/organisation" }, { label: "Platzplan", href: "/admin/plaetze" }],
  "/admin/raumplan":          [{ label: "Organisation", href: "/admin/organisation" }, { label: "Raumplan", href: "/admin/raumplan" }],
  "/admin/bilder/aufsteller": [{ label: "Organisation", href: "/admin/organisation" }, { label: "Bildaufsteller", href: "/admin/bilder/aufsteller" }],

  // Sonstiges
  "/admin/sonstiges":   [{ label: "Sonstiges", href: "/admin/sonstiges" }],
  "/admin/export":      [{ label: "Sonstiges", href: "/admin/sonstiges" }, { label: "DATEV-Export", href: "/admin/export" }],
  "/admin/import":      [{ label: "Sonstiges", href: "/admin/sonstiges" }, { label: "CSV / Excel Import", href: "/admin/import" }],
  "/admin/archiv":      [{ label: "Sonstiges", href: "/admin/sonstiges" }, { label: "Archivierung", href: "/admin/archiv" }],
  "/admin/impressum":   [{ label: "Sonstiges", href: "/admin/sonstiges" }, { label: "Impressum", href: "/admin/impressum" }],
  "/admin/datenschutz": [{ label: "Sonstiges", href: "/admin/sonstiges" }, { label: "Datenschutz", href: "/admin/datenschutz" }],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [rolle, setRolle] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setRolle(getRolle());
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  function abmelden() {
    logout();
    router.push("/admin/login");
  }

  const crumbs = CRUMBS[pathname] ?? [];
  const rolleLabel =
    rolle === "admin" ? "Admin"
    : rolle === "orga" ? "Orga-Team"
    : rolle === "kasse" ? "Kasse"
    : rolle === "kuenstler" ? "Künstler"
    : "";

  return (
    <div>
      <div className="bg-lions-blue text-white text-xs px-4 py-1.5 flex justify-between items-center no-print">
        <div className="flex items-center gap-1.5">
          <Link href="/admin" className="opacity-75 hover:opacity-100 hover:underline transition-opacity">
            {rolleLabel}
          </Link>
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <span className="opacity-40">›</span>
              {i === crumbs.length - 1 ? (
                <span className="opacity-90">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="opacity-75 hover:opacity-100 hover:underline transition-opacity">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </div>
        <button
          onClick={abmelden}
          className="opacity-75 hover:opacity-100 hover:underline transition-opacity"
        >
          Abmelden
        </button>
      </div>
      {children}
    </div>
  );
}
