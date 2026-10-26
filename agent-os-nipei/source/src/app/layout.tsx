import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { SCRIPT_TEMA } from "@/components/ds/temaScript";
import { CompanyProvider } from "@/context/CompanyContext";
import { LanguageProvider } from "@/context/LanguageContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Without an explicit viewport the OS renders at desktop width on phones, so every
// panel looks shrunk and the two-column build views become unusable.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#051601",
};

export const metadata: Metadata = {
  title: "Nipëi",
  description: "Tarefas, agenda e equipes do Santuário Nipeihu",
  // Installable app (see app/manifest.ts); iPhone reads the apple-* tags instead of the manifest.
  icons: { icon: "/icons/favicon-48.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Nipëi", statusBarStyle: "default" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: SCRIPT_TEMA põe data-tema no <html> antes da hidratação
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* tema da v2 antes de pintar (components/ds/Tema.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {/*
          Midnight Aubergine design system — three voices:
          Bricolage Grotesque (display) · Manrope (body) · Caveat (hand-script
          numerals/emphasis) · JetBrains Mono (code).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Outfit:wght@100..900&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Caveat:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full">
        <div className="relative z-10">
          <LanguageProvider>
            <CompanyProvider>
              <Shell>{children}</Shell>
            </CompanyProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  );
}
