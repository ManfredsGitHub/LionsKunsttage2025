import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import Providers from "./Providers";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: {
    default: "Kunsttage auf der Ludwigshöhe 2026",
    template: "%s | Kunsttage auf der Ludwigshöhe",
  },
  description: "Kunstausstellung und Benefizveranstaltung im Schloss Villa Ludwigshöhe, Edenkoben – organisiert von den Lions Clubs der Südpfalz.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    siteName: "Kunsttage auf der Ludwigshöhe",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/villa.jpg", width: 1200, height: 630, alt: "Schloss Villa Ludwigshöhe – Kunsttage 2026" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={cormorant.variable}>
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <KeyboardShortcuts />
          <Header />
          <div className="bg-lions-blue/5 border-b border-lions-blue/10 text-center py-1.5 px-4 text-xs text-lions-blue tracking-wide print:hidden">
            <span className="font-semibold">17. &amp; 18. Oktober 2026</span>
            {" · "}Schloss Villa Ludwigshöhe, Edenkoben{" · "}
            <span className="font-semibold">Eintritt frei</span>
          </div>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <footer className="mt-16 py-6 text-center text-sm text-gray-400 border-t print:hidden">
            <p>Kunsttage auf der Ludwigshöhe · Eine Benefizveranstaltung der Lions Clubs der Südpfalz · Alle Erlöse für gemeinnützige Zwecke</p>
            <p className="mt-2 flex items-center justify-center gap-4">
              <Link href="/impressum" className="hover:text-gray-600 underline underline-offset-2">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-gray-600 underline underline-offset-2">Datenschutz</Link>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
