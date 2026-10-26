import { Geist, Geist_Mono } from "next/font/google";

// Fontes só da v1 (Shell.tsx as aplica nas rotas v1). A v2 usa Outfit + Google Sans (app/layout.tsx).
// preload: false → o arquivo só é baixado quando uma tela v1 usa a fonte.
export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], preload: false });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

/** Google Fonts que o CSS da v1 pede pelo nome (globals.css e componentes v1). */
export const FONTES_V1_URL =
  "https://fonts.googleapis.com/css2?family=Alata&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700" +
  "&family=Outfit:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Caveat:wght@400;500;600&display=swap";
