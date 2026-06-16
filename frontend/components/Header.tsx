import Link from "next/link";
import MerklisteNavLink from "./MerklisteNavLink";

export default function Header() {
  return (
    <header className="bg-lions-blue text-white print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3" aria-label="Kunsttage auf der Ludwigshöhe">
          <span className="kunsttage-header">
            <span>K</span>
            <span>u</span>
            <span>n</span>
            <span>s</span>
            <span>t</span>
            <span>t</span>
            <span>a</span>
            <span>g</span>
            <span>e</span>
          </span>
          <span className="text-white text-base tracking-widest uppercase"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 700 }}>
            auf der Ludwigshöhe
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/veranstaltung" className="hover:text-lions-gold transition-colors">Veranstaltung</Link>
          <Link href="/" className="hover:text-lions-gold transition-colors">Galerie</Link>
          <Link href="/kuenstler" className="hover:text-lions-gold transition-colors">Künstler</Link>
          <MerklisteNavLink />
          <Link
            href="/admin"
            className="opacity-30 hover:opacity-70 transition-opacity text-xs border border-white/30 rounded px-2 py-1"
            title="Verwaltung"
          >
            ⚙
          </Link>
        </nav>
      </div>
    </header>
  );
}
