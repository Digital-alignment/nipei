import type { Metadata } from "next";
import { Google_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { SCRIPT_TEMA } from "@/components/ds/temaScript";
import { CompanyProvider } from "@/context/CompanyContext";
import { LanguageProvider } from "@/context/LanguageContext";

// Tipografia do design system (DESIGN-SYSTEM.md seção 4): Outfit (títulos, números) e Google Sans (o resto).
// Viram --fonte-display / --fonte-texto em globals.css. As fontes da v1 ficam em components/fontesV1.ts.
// preload: false → o navegador só baixa o que a tela usa (ex.: itálico e Outfit só quando aparecem).
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: "variable", preload: false });
const googleSans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], adjustFontFallback: false, preload: false }); // next/font has no fallback metrics for Google Sans yet

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
    <html lang="en" className={`${outfit.variable} ${googleSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* tema da v2 antes de pintar (components/ds/Tema.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
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
