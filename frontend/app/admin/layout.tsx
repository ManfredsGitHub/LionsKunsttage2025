"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getRolle, logout } from "@/lib/auth";
import { ADMIN_NAV } from "@/lib/adminNav";

function buildCrumbs(path: string): Array<{ label: string; href: string }> {
  const entry = ADMIN_NAV.find(e => e.href === path);
  if (!entry) return [];
  const result: Array<{ label: string; href: string }> = [];
  if (entry.crumbParent) {
    const parent = ADMIN_NAV.find(e => e.href === entry.crumbParent);
    if (parent) {
      result.push({ label: parent.crumbLabel ?? parent.label, href: parent.href });
    }
  }
  result.push({ label: entry.crumbLabel ?? entry.label, href: entry.href });
  return result;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [rolle, setRolle] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const r = getRolle();
    if (!r && pathname !== "/admin/login") {
      router.replace("/admin/login");
    } else {
      setRolle(r);
    }
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  async function abmelden() {
    await logout();
    router.push("/admin/login");
  }

  const crumbs = buildCrumbs(pathname);
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
