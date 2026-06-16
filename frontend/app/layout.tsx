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
  title: "Kunsttage auf der Ludwigshöhe 2026",
  description: "Kunstausstellung und Benefizveranstaltung im Schloss Villa Ludwigshöhe, Edenkoben – organisiert von den Lions Clubs der Südpfalz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={cormorant.variable}>
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <KeyboardShortcuts />
          <Header />
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
