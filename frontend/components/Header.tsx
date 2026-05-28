import Link from "next/link";
import MerklisteNavLink from "./MerklisteNavLink";

export default function Header() {
  return (
    <header className="bg-lions-blue text-white print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-bold text-4xl">
            <span className="text-lions-gold">Kunsttage</span>
            <span className="text-white"> auf der Ludwigshöhe</span>
          </span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/veranstaltung" className="hover:text-lions-gold transition-colors">Veranstaltung</Link>
          <Link href="/" className="hover:text-lions-gold transition-colors">Galerie</Link>
          <Link href="/kuenstler" className="hover:text-lions-gold transition-colors">Künstler</Link>
          <MerklisteNavLink />
          <Link href="/kuenstler/login" className="hover:text-lions-gold transition-colors">Künstler-Login</Link>
        </nav>
      </div>
    </header>
  );
}
