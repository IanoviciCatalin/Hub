import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/profile";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${profile.name} · ${profile.role}`, template: `%s · ${profile.siteName}` },
  description: profile.intro,
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        {/* Marchează că JS rulează, ca animațiile de scroll să nu ascundă conținut fără JS. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex flex-col">
        <a href="#continut" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn btn-primary">
          Sari la conținut
        </a>
        <Nav />
        <main id="continut" className="flex-1">{children}</main>
        <Footer />
        <RevealObserver />
      </body>
    </html>
  );
}
