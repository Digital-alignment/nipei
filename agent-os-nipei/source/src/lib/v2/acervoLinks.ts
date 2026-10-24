// What kind of link an Acervo item is, from its URL alone (no network, no Google access needed).
// Shared by the page (label on each card) and the add form (suggests the type while typing).

export type TipoLink = { rotulo: string; sugere: string };

export function tipoLink(url: string): TipoLink | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const h = u.hostname.replace(/^www\./, ""), p = u.pathname;
  if (h === "drive.google.com" && /\/folders\//.test(p)) return { rotulo: "Pasta do Drive", sugere: "" };
  if (h === "drive.google.com") return { rotulo: "Arquivo do Drive", sugere: "" };
  if (h === "docs.google.com" && p.startsWith("/document")) return { rotulo: "Documento Google", sugere: "documentos" };
  if (h === "docs.google.com" && p.startsWith("/spreadsheets")) return { rotulo: "Planilha Google", sugere: "documentos" };
  if (h === "docs.google.com" && p.startsWith("/presentation")) return { rotulo: "Apresentação Google", sugere: "documentos" };
  if (h === "docs.google.com" && p.startsWith("/forms")) return { rotulo: "Formulário Google", sugere: "documentos" };
  if (h === "photos.google.com" || h === "photos.app.goo.gl") return { rotulo: "Google Fotos", sugere: "fotos" };
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return { rotulo: "YouTube", sugere: "videos" };
  if (/(^|\.)vimeo\.com$/.test(h)) return { rotulo: "Vimeo", sugere: "videos" };
  if (/(^|\.)spotify\.com$|(^|\.)soundcloud\.com$/.test(h)) return { rotulo: h.split(".").slice(-2, -1)[0].replace(/^./, (c) => c.toUpperCase()), sugere: "audios" };
  if (/\.(pdf|docx?|xlsx?|pptx?)$/i.test(p)) return { rotulo: p.split(".").pop()!.toUpperCase(), sugere: "documentos" };
  if (/\.(jpe?g|png|webp|gif)$/i.test(p)) return { rotulo: "Imagem", sugere: "fotos" };
  if (/\.(mp4|mov|webm)$/i.test(p)) return { rotulo: "Vídeo", sugere: "videos" };
  if (/\.(mp3|wav|m4a|ogg)$/i.test(p)) return { rotulo: "Áudio", sugere: "audios" };
  return { rotulo: h, sugere: "" };
}

/** Same file/folder even when shared with different suffixes (?usp=sharing, /view, trailing slash). */
export function chaveLink(url: string): string {
  const id = url.match(/\/(?:folders|d)\/([\w-]{10,})/)?.[1] ?? url.match(/[?&]id=([\w-]{10,})/)?.[1];
  if (id) return `g:${id}`;
  try { const u = new URL(url.trim()); return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase(); } catch { return url.trim().toLowerCase(); }
}
