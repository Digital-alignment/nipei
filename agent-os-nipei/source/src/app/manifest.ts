import type { MetadataRoute } from "next";

// Makes os.nipeihu.app installable ("Adicionar à tela inicial"): opens straight on Hoje, full screen.
// Icons are generated from the Nipeihu logo in public/brand/ (nipeihu-logo.svg is the original).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nipëi",
    short_name: "Nipëi",
    description: "Tarefas, agenda e equipes do Santuário Nipeihu",
    start_url: "/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#051601",
    theme_color: "#051601",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
