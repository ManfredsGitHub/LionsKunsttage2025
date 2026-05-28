import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "Kunsttage auf der Ludwigshöhe 2026",
  description: "Kunstausstellung und Benefizveranstaltung im Schloss Villa Ludwigshöhe, Edenkoben – organisiert von den Lions Clubs der Südpfalz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <footer className="mt-16 py-6 text-center text-sm text-gray-400 border-t print:hidden">
            Kunsttage auf der Ludwigshöhe · Eine Benefizveranstaltung der Lions Clubs der Südpfalz · Alle Erlöse für gemeinnützige Zwecke
          </footer>
        </Providers>
      </body>
    </html>
  );
}
