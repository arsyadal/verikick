import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VeriKick — Verifiable World Cup Prediction Markets",
  description:
    "World Cup prediction markets with deterministic settlement and Merkle-verifiable receipts, powered by TxLINE data feeds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="display font-extrabold text-lg tracking-tight">
              VERI<span className="text-phosphor">KICK</span>
              <span className="text-ink-dim font-normal text-sm ml-2">WC·26</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="hover:text-phosphor transition-colors">Markets</Link>
              <Link href="/portfolio" className="hover:text-phosphor transition-colors">Portfolio</Link>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber border border-amber/40 rounded-full px-2.5 py-1">
                SIM FEED · TxLINE-shaped
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-ink-dim border-t border-line mt-12">
          Demo build for the TxODDS World Cup Hackathon — no real-money wagering. Settlement receipts are
          Merkle-verifiable in your browser.
        </footer>
      </body>
    </html>
  );
}
