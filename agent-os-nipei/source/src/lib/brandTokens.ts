/**
 * NIPËI OS BRAND SYSTEM TOKENS & DESIGN SYSTEM CONTRACTS
 * Source of Truth for Nipëi OS UI Design System
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
  mainBodyBg: "#2B2C30",
  bentoCardBg: "#0a0f16",
  heroCardBg: "#070705",
  personalScope: {
    primary: "#706c61",
    glow: "#8D897C",
    rgbaGlow: "rgba(141, 137, 124, 0.4)",
  },
  empresaScope: {
    primary: "#B49B43",
    glow: "#c2ac5b",
    rgbaGlow: "rgba(194, 172, 91, 0.4)",
  },
  typography: {
    alata: "'Alata', sans-serif", // Horarios, porcentajes, badges y métricas
    googleSans: "'Google Sans', sans-serif", // Títulos, descripciones y botones
    spaceMono: "'Space Mono', monospace", // Elementos, badges, agentes y códigos
  },
  sharpCrispBorders: "1px solid rgba(255, 255, 255, 0.12)",
  noEmojiInHeaders: true,
};

export const COLOR_TOKENS: ColorToken[] = [
  {
    name: "Main Body Background (Nivel 0)",
    hex: "#2B2C30",
    rgb: "43, 44, 48",
    usage: "Fondo principal de pantalla de Nipëi OS",
    category: "brand",
  },
  {
    name: "Bento Cards Background (Nivel 1)",
    hex: "#0a0f16",
    rgb: "10, 15, 22",
    usage: "Fondo sólido para Bento Cards y contenedores modulares",
    category: "brand",
  },
  {
    name: "Hero Cards Background (Nivel 2)",
    hex: "#070705",
    rgb: "7, 7, 5",
    usage: "Fondo profundo para Hero Cards y actividad destacada",
    category: "brand",
  },
  {
    name: "Ámbito Personal Primary",
    hex: "#706c61",
    rgb: "112, 108, 97",
    usage: "Acento principal para flujo y orbes personales",
    category: "semantic",
  },
  {
    name: "Ámbito Personal Glow",
    hex: "#8D897C",
    rgb: "141, 137, 124",
    usage: "Resplandor y bordes de cristal para ámbito personal",
    category: "semantic",
  },
  {
    name: "Ámbito Empresa Primary",
    hex: "#B49B43",
    rgb: "180, 155, 67",
    usage: "Acento principal para flujo y orbes corporativos",
    category: "semantic",
  },
  {
    name: "Ámbito Empresa Glow",
    hex: "#c2ac5b",
    rgb: "194, 172, 91",
    usage: "Resplandor y bordes dorados para ámbito empresa",
    category: "semantic",
  },
];

export const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  {
    role: "Horarios, Porcentajes & Métricas Clave",
    fontFamily: "'Alata', sans-serif",
    fontSize: "12px - 28px",
    fontWeight: "400",
    letterSpacing: "0em",
    usage: "Obligatorio para horarios (08:30 - 11:30), porcentajes (80% CONCLUÍDO) y contadores KPI",
  },
  {
    role: "Títulos Principales & Botones",
    fontFamily: "'Google Sans', sans-serif",
    fontSize: "14px - 32px",
    fontWeight: "400 - 700",
    letterSpacing: "-0.01em",
    usage: "Encabezados de sección, títulos de tarjetas, descripciones y botones",
  },
  {
    role: "Badges, Agentes & Código",
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px - 13px",
    fontWeight: "400 / 700",
    letterSpacing: "0em",
    usage: "Badges de estado, tags de agentes IA (@vaultkeeper), metodologías y rutas",
  },
];


export const TONE_OF_VOICE_RULES = [
  "1. Cero Alucinaciones: Toda afirmación técnica o medicinal debe estar sustentada en nipei-vault.",
  "2. Respeto Étnico & Botánico: Usar nombres sagrados y taxonomía exacta de Yawanawá e Inî Rau.",
  "3. Sobriedad Sin Gradientes: Comunicación visual plana, sólida y de alto contraste.",
  "4. Claridad Operativa: Mensajes directos para Ana Castro y líderes de Squad sin rodeos publicitarios."
];
