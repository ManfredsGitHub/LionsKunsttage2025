"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getRolle, logout } from "@/lib/auth";

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

  return (
    <div>
      <div className="bg-lions-blue text-white text-xs px-4 py-1.5 flex justify-between items-center no-print">
        <Link href="/admin" className="opacity-75 hover:opacity-100 hover:underline transition-opacity">
          {rolle === "admin" ? "Admin" : rolle === "orga" ? "Orga-Team" : ""}
        </Link>
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
