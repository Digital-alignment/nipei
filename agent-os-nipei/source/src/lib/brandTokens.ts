/**
 * NIPËI OS BRAND SYSTEM TOKENS & DESIGN SYSTEM RULES
 * Strictly Solid Colors (ZERO GRADIENTS POLICY)
 */

export interface ColorToken {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
  category: "brand" | "squad" | "neutral" | "semantic";
}

export interface TypographyToken {
  role: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  usage: string;
}

export const NIPEI_BRAND_RULES = {
  zeroGradients: true, // STRICT: No linear/radial gradients anywhere in UI
  solidPanelsOnly: true, // Solid #050805, #0c140c, #142614
  sharpCrispBorders: "1px solid #182818",
  noEmojiInHeaders: true, // Use Lucide React icons instead of emojis in corporate headers
  groundingRequired: true, // 100% Zero-Hallucination policy, grounded in nipei-vault
};

export const COLOR_TOKENS: ColorToken[] = [
  // Brand Core
  {
    name: "Obsidiana Fondo Base",
    hex: "#050805",
    rgb: "5, 8, 5",
    usage: "Fondo principal de pantalla y cuerpo del sistema",
    category: "brand",
  },
  {
    name: "Obsidiana Panel Elevado",
    hex: "#0c140c",
    rgb: "12, 20, 12",
    usage: "Fondo sólido para tarjetas, modales y barras laterales",
    category: "brand",
  },
  {
    name: "Borde Sutil Nipëi",
    hex: "#182818",
    rgb: "24, 40, 24",
    usage: "Líneas divisoras y bordes de tarjetas sin gradientes",
    category: "brand",
  },
  {
    name: "Verde Esmeralda Nipëi",
    hex: "#22c55e",
    rgb: "34, 197, 94",
    usage: "Acento primario, estado activo, botones principales e indicadores de salud",
    category: "brand",
  },

  // Squad Color Tokens (Solid Colors)
  {
    name: "Verde Botánico Mutum (Squad II)",
    hex: "#10b981",
    rgb: "16, 185, 129",
    usage: "Fitoterapia, Inî Rau, catálogo de plantas y producción Mutum",
    category: "squad",
  },
  {
    name: "Púrpura Retiros / Venu (Squad III)",
    hex: "#a855f7",
    rgb: "168, 85, 247",
    usage: "Retiros Samakey, Venu, facilitación y sabiduría ancestral",
    category: "squad",
  },
  {
    name: "Azul Ventas & Mkt (Squad IV)",
    hex: "#3b82f6",
    rgb: "59, 130, 246",
    usage: "Comercio ético, lotes y campañas comerciales",
    category: "squad",
  },
  {
    name: "Cian Gobernanza (Squad V)",
    hex: "#00CCFF",
    rgb: "0, 204, 255",
    usage: "Adm, Legal, DRE contable y centro de costos",
    category: "squad",
  },
  {
    name: "Ámbar Infraestructura (Squad VI)",
    hex: "#f5a623",
    rgb: "245, 166, 35",
    usage: "Servicios conectados, APIs, Ollama local y servidores",
    category: "squad",
  },
  {
    name: "Rosa Instituto Mutum (Squad VII)",
    hex: "#ec4899",
    rgb: "236, 72, 153",
    usage: "Donantes, proyectos comunitarios e impacto social",
    category: "squad",
  },

  // Semantic
  {
    name: "Alerta Error / Veto",
    hex: "#ef4444",
    rgb: "239, 68, 68",
    usage: "Fallos de RAG, errores de compilación o vetos comerciales",
    category: "semantic",
  },
  {
    name: "Advertencia / Take-Over",
    hex: "#f59e0b",
    rgb: "245, 158, 11",
    usage: "Intervención humana activa o vacíos de conocimiento pendientes",
    category: "semantic",
  },
];

export const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  {
    role: "Títulos Principales (H1, H2)",
    fontFamily: "Outfit, sans-serif",
    fontSize: "24px - 36px",
    fontWeight: "800 / 900 (Black)",
    letterSpacing: "-0.02em (Tight)",
    usage: "Encabezados de vistas principales, badges de marca y títulos de sección",
  },
  {
    role: "Subtítulos & Secciones (H3, H4)",
    fontFamily: "Outfit, sans-serif",
    fontSize: "16px - 20px",
    fontWeight: "700 (Bold)",
    letterSpacing: "0em",
    usage: "Títulos de tarjetas, paneles y modales",
  },
  {
    role: "Cuerpo de Texto & Interfaz",
    fontFamily: "Manrope, sans-serif",
    fontSize: "13px - 14px",
    fontWeight: "400 / 600 (Normal / Semibold)",
    letterSpacing: "0em",
    usage: "Párrafos explicativos, etiquetas de formularios y descripciones",
  },
  {
    role: "Datos, Código & Checksums",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px - 12px",
    fontWeight: "500 / 700 (Medium / Bold)",
    letterSpacing: "0em",
    usage: "Hashes SHA-256, rutas del Vault, logs de auditoría y comandos",
  },
];

export const TONE_OF_VOICE_RULES = [
  "1. Cero Alucinaciones: Toda afirmación técnica o medicinal debe estar sustentada en nipei-vault.",
  "2. Respeto Étnico & Botánico: Usar nombres sagrados y taxonomía exacta de Yawanawá e Inî Rau.",
  "3. Sobriedad Sin Gradientes: Comunicación visual plana, sólida y de alto contraste.",
  "4. Claridad Operativa: Mensajes directos para Ana Castro y líderes de Squad sin rodeos publicitarios.",
];
