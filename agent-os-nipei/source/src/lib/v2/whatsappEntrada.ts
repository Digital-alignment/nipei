import fs from "fs";
import path from "path";
import { getPessoas, meDaPessoa, vault, type Me, type Pessoa } from "./data";
import { chaveTrecho, criarFonte, getFatos, getFontes, podeRevisar, processarFonte } from "./conhecimento";
import { getAlertas } from "./auditor";
import { sugerirAcoes, type AcaoSugerida } from "./propostas";
import { conversar, executarAcao, getConversa, paraModelo, salvarConversa, validar, type AcaoProposta, type MsgSalva } from "./assistente";
import { contarUso } from "./ia";
import { enviarWhatsApp } from "./whatsapp";
import { registrarEvento } from "./eventos";
import { registrarCustoIA } from "./custosIA";
import { funcaoLigada } from "./funcoes";

// "Encaminhar para o Nipëi": a person writes or forwards a text or voice note to the Nipëi WhatsApp number.
// Same assistant, same conversation and memory as the panel; proposals come back numbered and are confirmed
// by replying "sim", the numbers ("1 3") or "não" (or on the cards in the panel). Only people whose profile
// number matches and who can use the assistant (Equipe 1 today); everyone else is ignored in silence.
//
// C7 fase 3 — Conhecimento by WhatsApp (any member with a verified number, switch "whatsapp_conhecimento"):
// "conhecimento:" / "#guardar" at the start (or in a photo/PDF caption) saves it as a source at once;
// a forwarded text, a photo, a PDF (or a voice note from someone without the assistant) gets "Guardo no
// Conhecimento? sim / não" — the offer waits 30 min in <vault>/.jobs/whatsapp-ofertas/<pessoa>.json. For the
// assistant's users, "não" to a forwarded text sends it to the Pinu as usual. Everything goes through review.

type Chave = { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean; id?: string };
type Dados = { key?: Chave; pushName?: string; messageType?: string; message?: Record<string, unknown> & { base64?: string } };

const vistos = new Set<string>(); // Evolution may deliver the same message twice
const digitos = (s: string) => s.replace(/@.*/, "").replace(/\D/g, "");

/** WhatsApp ids for Brazilian mobiles sometimes drop the 9 after the area code: compare both forms. */
export function mesmoNumero(a: string, b: string) {
  const x = digitos(a), y = digitos(b);
  if (!x || !y) return false;
  const sem9 = (d: string) => (/^55\d{2}9\d{8}$/.test(d) ? d.slice(0, 4) + d.slice(5) : d);
  return x === y || sem9(x) === sem9(y);
}

function remetente(k: Chave): Pessoa | null {
  const ids = [k.remoteJid, k.remoteJidAlt, k.senderPn].filter((x): x is string => !!x && /@s\.whatsapp\.net$/.test(x));
  return getPessoas().find((p) => p.whatsapp && ids.some((id) => mesmoNumero(id, p.whatsapp))) ?? null;
}

const textoDe = (m: Record<string, unknown> = {}) =>
  String((m.conversation as string) ?? (m.extendedTextMessage as { text?: string })?.text ?? (m.imageMessage as { caption?: string })?.caption ?? "").trim();

/** The media of a message (voice note, photo, document) as base64; Evolution sends it inline (webhookBase64) or on request. */
async function midiaBase64(d: Dados, a: { mimetype?: string } | undefined, padrao: string): Promise<{ base64: string; mime: string } | null> {
  if (!a) return null;
  if (d.message?.base64) return { base64: d.message.base64, mime: (a.mimetype || padrao).split(";")[0] };
  const { EVOLUTION_API_URL: url, EVOLUTION_API_KEY: key, EVOLUTION_INSTANCE_NAME: inst } = process.env;
  const r = await fetch(`${url}/chat/getBase64FromMediaMessage/${inst}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: key ?? "" }, body: JSON.stringify({ message: { key: d.key }, convertToMp4: false }), signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  return j?.base64 ? { base64: j.base64, mime: (j.mimetype || a.mimetype || padrao).split(";")[0] } : null;
}
const audioBase64 = (d: Dados) => midiaBase64(d, d.message?.audioMessage as { mimetype?: string } | undefined, "audio/ogg");

/** Voice note → text (Gemini; NIPEI_TRANSCRICAO_MODEL, default the current flash-lite). */
export async function transcrever(base64: string, mime: string, pessoa?: string): Promise<string> {
  const modelo = process.env.NIPEI_TRANSCRICAO_MODEL || "gemini-flash-lite-latest";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: "Transcreva este áudio exatamente, no idioma falado. Responda só com a transcrição." }, { inline_data: { mime_type: mime.split(";")[0], data: base64 } }] }] }),
  });
  if (!r.ok) throw new Error(`transcrição falhou (${r.status})`);
  const j = await r.json();
  registrarCustoIA(pessoa, "transcricao", "gemini", modelo, j?.usageMetadata);
  return String(j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "").trim();
}

const resumoCartoes = (m: MsgSalva) => (m.cartoes ?? []).map((c, i) => ({ c, i })).filter(({ c }) => c.estado === "pendente");
const paraWhats = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();

/** "sim" / "não" / "1 3" right after numbered proposals. */
export function lerDecisao(t: string): "todas" | "nenhuma" | number[] | null {
  const s = t.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[.!]+$/, "");
  if (/^(sim|s|ok|confirmo|confirmar|confirma|pode|yes|si|dale)$/.test(s)) return "todas";
  if (/^(nao|n|cancela|cancelar|no)$/.test(s)) return "nenhuma";
  if (/^\d+([\s,e]+\d+)*$/.test(s)) return [...new Set(s.split(/[\s,e]+/).map(Number))];
  return null;
}

async function decidir(me: Me, dono: string, quem: string, escolha: "todas" | "nenhuma" | number[]): Promise<string> {
  const msgs = getConversa(dono);
  const ultima = [...msgs].reverse().find((m) => m.role === "assistant");
  const pend = ultima ? resumoCartoes(ultima) : [];
  const linhas: string[] = [];
  for (const [n, { c }] of pend.entries()) {
    const quer = escolha === "todas" || (Array.isArray(escolha) && escolha.includes(n + 1));
    if (!quer) { c.estado = "cancelado"; continue; }
    try { c.link = await executarAcao(me, c, quem); c.estado = "feito"; linhas.push(`✅ ${c.resumo}${c.link?.startsWith("/") ? `\nhttps://os.nipeihu.app${c.link}` : c.link ? `\n${c.link}` : ""}`); }
    catch (e) { c.estado = "erro"; c.erro = (e as Error).message; linhas.push(`⚠️ ${c.resumo}: ${c.erro}`); }
  }
  salvarConversa(dono, msgs);
  return escolha === "nenhuma" ? "Ok, cancelei as propostas." : linhas.join("\n\n") || "Nada para confirmar.";
}

// ---------------------------------------------------------------- C7 fase 3: Conhecimento by WhatsApp

const PALAVRA = /^\s*(?:conhecimento\s*:|#guardar\b:?)\s*/i;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "text/plain": "txt", "text/csv": "csv", "text/markdown": "md" };
type Midia = { base64: string; mime: string };
type Oferta = { em: string; texto: string; titulo: string; midia?: Midia; paraPinu: boolean };
const OFERTA_MS = 30 * 60_000;
const arqOferta = (pessoa: string) => path.join(vault(), ".jobs", "whatsapp-ofertas", `${pessoa}.json`);
function lerOferta(pessoa: string): Oferta | null {
  try { const o = JSON.parse(fs.readFileSync(arqOferta(pessoa), "utf-8")) as Oferta; return Date.now() - Date.parse(o.em) < OFERTA_MS ? o : null; } catch { return null; }
}
function gravarOferta(pessoa: string, o: Oferta | null) {
  if (!o) { fs.rmSync(arqOferta(pessoa), { force: true }); return; }
  fs.mkdirSync(path.dirname(arqOferta(pessoa)), { recursive: true });
  fs.writeFileSync(arqOferta(pessoa), JSON.stringify(o));
}
const ajudaDada = new Map<string, string>(); // person → day the "how to send" help went out (once a day)

/** WhatsApp wraps some messages (document with caption, disappearing, view once): the inner one. */
function interna(m: Record<string, unknown> = {}): Record<string, unknown> {
  for (const k of ["documentWithCaptionMessage", "ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2"]) {
    const x = (m[k] as { message?: Record<string, unknown> } | undefined)?.message;
    if (x) return interna(x);
  }
  return m;
}
const foiEncaminhado = (m: Record<string, unknown>) => ["extendedTextMessage", "imageMessage", "documentMessage", "audioMessage", "videoMessage"]
  .some((k) => (m[k] as { contextInfo?: { isForwarded?: boolean } } | undefined)?.contextInfo?.isForwarded);

/** Saves the content as a Conhecimento source (canal "whatsapp"); the same text/file again returns the existing one. */
function guardar(p: Pessoa, c: { texto: string; titulo: string; midia?: Midia }): { id: string; ja: boolean } {
  const chave = chaveTrecho("w", c.midia?.base64 ?? c.texto);
  const ja = getFontes().find((f) => f.chave === chave && f.status !== "erro");
  if (ja) return { id: ja.id, ja: true };
  const base = { titulo: c.titulo.slice(0, 150), por: p.id, canal: "whatsapp" as const, chave };
  let id: string;
  if (c.midia) {
    const ext = EXT[c.midia.mime];
    if (!ext) throw new Error("por enquanto guardo PDF, foto (JPG, PNG, WebP) ou texto");
    id = criarFonte({ ...base, tipo: "arquivo", nome: `whatsapp.${ext}`, bytes: Buffer.from(c.midia.base64, "base64") });
  } else id = criarFonte({ ...base, tipo: "texto", texto: c.texto });
  void processarFonte(id).then(() => avisarResultado(p, id)).catch((e) => console.warn("[whatsapp conhecimento]", (e as Error).message));
  return { id, ja: false };
}

const ROTULO_ALERTA: Record<string, string> = { contradicao: "Contradiz a base", ja_corrigido: "Já foi corrigido antes", duplicado: "Repete o que já está na base", desatualizado: "Prazo vencido" };
// summary lines only (markdown headings dropped, so "## Decisão" doesn't glue onto the first sentence)
const primeirasFrases = (md: string, n = 2) => {
  const t = md.split("\n").filter((l) => !/^\s*#/.test(l)).join(" ").replace(/[*_>`]/g, "").replace(/\s+/g, " ").trim();
  return (t.match(/[^.!?]+[.!?]+/g) ?? [t]).slice(0, n).join(" ").replace(/\s+/g, " ").trim().slice(0, 400);
};
const semIds = (t: string) => t.replace(/\s*\(?\b(?:task|evt|fat|fnt|prp)_[\w]+\)?/g, "").replace(/\s{2,}/g, " ").trim(); // people never see internal ids

/**
 * C7 fase 4: once the AI has read a source sent by WhatsApp (and the auditor has compared it with the base),
 * tell the sender what came out: a short summary, how many facts, contradictions/duplicates, and up to 2
 * suggested actions — the assistant's users get them as numbered cards ("sim / 1 / não"), others as information.
 */
export async function avisarResultado(p: Pessoa, id: string) {
  const f = getFontes().find((x) => x.id === id);
  if (!f || !p.whatsapp) return;
  const link = `https://os.nipeihu.app/conhecimento/${id}`;
  if (f.status === "erro") {
    await enviarWhatsApp(p.whatsapp, `Não consegui ler *${f.titulo}*: ${f.erro}\nSe for um arquivo, mande como PDF ou foto nítida; se for texto, cole o conteúdo depois de *conhecimento:*.\n${link}`);
    return;
  }
  const me = meDaPessoa(p.id);
  const fatos = getFatos().filter((x) => x.fonte === id && x.status === "proposto");
  const porId = new Map(getFatos().map((x) => [x.id, x]));
  const alertas = getAlertas().filter((a) => a.status === "aberta" && fatos.some((x) => x.id === a.fato)).slice(0, 3);
  let sugestoes: AcaoSugerida[] = [];
  try { sugestoes = await sugerirAcoes(fatos); } catch (e) { console.warn("[whatsapp conhecimento] sugestões:", (e as Error).message); }

  const revisa = !!me && fatos.some((x) => podeRevisar(me, x));
  const partes = [
    `*${f.titulo}* — já li.`,
    f.resumo ? primeirasFrases(f.resumo) : "",
    fatos.length ? `Separei *${fatos.length} fato${fatos.length > 1 ? "s" : ""}* para a revisão${revisa ? `:\nhttps://os.nipeihu.app/conhecimento/revisar?fonte=${id}` : " (a gestão ou a coordenação revisa)."}` : "Não achei fatos claros para a base nesta fonte.",
    alertas.length ? `*Atenção:*\n${alertas.map((a) => `• ${ROTULO_ALERTA[a.tipo] ?? a.tipo}: ${semIds(a.explicacao).slice(0, 200)}${a.outros[0] && porId.get(a.outros[0]) ? `\n  _"${porId.get(a.outros[0])!.texto.slice(0, 140)}"_` : ""}`).join("\n")}` : "",
  ];
  // suggested actions: real cards for the assistant's users (the usual "sim / números / não" flow), information for the others
  const cartoes = me && funcaoLigada("whatsapp", me)
    ? sugestoes.map((x) => ({ x, v: validar(me, x.nome, x.args) })).filter((y): y is { x: AcaoSugerida; v: AcaoProposta } => !("erro" in y.v)).map(({ x, v }) => ({ ...v, detalhe: [v.detalhe, semIds(x.motivo)].filter(Boolean).join(" — "), estado: "pendente" as const }))
    : [];
  if (cartoes.length) {
    const msgs = getConversa(p.id);
    msgs.push({ role: "assistant", content: `Sugestões a partir de "${f.titulo}" (Conhecimento).`, em: new Date().toISOString(), cartoes });
    salvarConversa(p.id, msgs);
    partes.push(`*Sugestões:*\n${cartoes.map((c, i) => `${i + 1}. ${c.resumo}${c.detalhe ? ` — ${c.detalhe.slice(0, 160)}` : ""}`).join("\n")}\n\n${cartoes.length > 1 ? "Responda *sim* para todas, os *números* (ex.: 1 2) ou *não*." : "Responda *sim* ou *não*."}`);
  } else if (sugestoes.length) {
    partes.push(`*Pode ser útil:*\n${sugestoes.map((x) => `• ${semIds(x.motivo) || (x.args.titulo as string) || ""}`).join("\n")}\n_(a gestão vê isso na revisão)_`);
  }
  partes.push(link);
  await enviarWhatsApp(p.whatsapp, partes.filter(Boolean).join("\n\n").slice(0, 3500));
}
const tituloDe = (texto: string, p: Pessoa) => {
  const linha = texto.split("\n").map((x) => x.trim()).find((x) => x.length > 3) ?? "";
  return linha ? (linha.length > 80 ? `${linha.slice(0, 80).replace(/\s\S*$/, "")}…` : linha) : `WhatsApp de ${p.name.split(" (")[0]} — ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}`;
};
const avisoGuardado = (r: { id: string; ja: boolean }, titulo: string) => r.ja
  ? `Isso já está no Conhecimento:\nhttps://os.nipeihu.app/conhecimento/${r.id}`
  : `Guardado no Conhecimento: *${titulo}*\nA IA está separando os fatos para a revisão.\nhttps://os.nipeihu.app/conhecimento/${r.id}`;

/** Handles one Evolution "messages.upsert" (called in the background by the webhook). */
export async function processarEntrada(d: Dados): Promise<void> {
  const k = d.key ?? {};
  if (k.fromMe || !k.remoteJid || /@(g\.us|broadcast|newsletter)$/.test(k.remoteJid) || (k.id && vistos.has(k.id))) return;
  if (k.id) { vistos.add(k.id); if (vistos.size > 1000) vistos.delete(vistos.values().next().value!); }
  const p = remetente(k);
  const me = p ? meDaPessoa(p.id) : null;
  const pinu = funcaoLigada("whatsapp", me), conhecimento = pinu || funcaoLigada("whatsapp_conhecimento", me);
  if (!p || !me || !conhecimento) return; // unknown number, no access, or neither the assistant nor Conhecimento by WhatsApp
  const fone = p.whatsapp, quem = `${p.name.split(" (")[0]} (via WhatsApp)`, dono = p.id;
  try {
    const m = interna(d.message);
    let texto = textoDe(m) || String((m.documentMessage as { caption?: string } | undefined)?.caption ?? "").trim();
    const doc = (m.imageMessage ?? m.documentMessage) as { mimetype?: string; fileName?: string } | undefined;
    const midia = doc ? await midiaBase64({ ...d, message: { ...m, base64: d.message?.base64 } }, doc, "application/octet-stream") : null;
    const audio = !texto && !midia ? await audioBase64(d) : null;
    if (audio) texto = await transcrever(audio.base64, audio.mime, p.id);
    const encaminhado = foiEncaminhado(m);
    if (!texto && !midia) { await enviarWhatsApp(fone, "Por enquanto eu entendo texto, áudio, foto e PDF."); return; }

    // 1) the answer to "Guardo no Conhecimento?"
    const oferta = lerOferta(dono), sn = !midia ? lerDecisao(texto) : null;
    if (oferta && (sn === "todas" || sn === "nenhuma")) {
      gravarOferta(dono, null);
      if (sn === "todas") {
        const r = guardar(p, oferta);
        registrarEvento(dono, "guardou no Conhecimento", "pelo WhatsApp", "whatsapp");
        await enviarWhatsApp(fone, avisoGuardado(r, oferta.titulo)); return;
      }
      if (!(oferta.paraPinu && pinu)) { await enviarWhatsApp(fone, "Ok, não guardei."); return; }
      texto = oferta.texto; // "não" to a forwarded text: it was a question for the Pinu after all
    } else {
      // 2) keyword → straight to Conhecimento
      const palavra = texto.match(PALAVRA);
      if (palavra) {
        const conteudo = texto.slice(palavra[0].length).trim();
        const titulo = midia ? (conteudo || doc?.fileName || tituloDe("", p)) : tituloDe(conteudo, p);
        if (!midia && conteudo.length < 20) { await enviarWhatsApp(fone, "Escreva o conteúdo depois de *conhecimento:* (pelo menos uma frase)."); return; }
        const r = guardar(p, { texto: conteudo, titulo, midia: midia ?? undefined });
        registrarEvento(dono, "guardou no Conhecimento", "pelo WhatsApp (palavra-chave)", "whatsapp");
        await enviarWhatsApp(fone, avisoGuardado(r, titulo)); return;
      }
      // 3) forwarded, a photo/PDF, or a voice note from someone without the assistant → ask first
      if (midia || encaminhado || (audio && !pinu)) {
        const titulo = midia ? (texto || doc?.fileName || tituloDe("", p)) : tituloDe(texto, p);
        if (!midia && texto.length < 20) {
          // too short to be knowledge: the assistant's users get the Pinu below; the others, a short note
          if (!pinu) { await enviarWhatsApp(fone, "Mensagem curta demais para o Conhecimento."); return; }
        } else {
          gravarOferta(dono, { em: new Date().toISOString(), texto, titulo, midia: midia ?? undefined, paraPinu: !midia });
          await enviarWhatsApp(fone, `${audio ? `🎤 _${texto.slice(0, 300)}${texto.length > 300 ? "…" : ""}_\n\n` : ""}Guardo isso no Conhecimento? Responda *sim* ou *não*.${pinu && !midia ? " (Se não, eu respondo como uma pergunta.)" : ""}`);
          return;
        }
      }
      // 4) a plain text from someone without the assistant: how to send (once a day)
      if (!pinu) {
        const hoje = new Date().toISOString().slice(0, 10);
        if (ajudaDada.get(dono) !== hoje) {
          ajudaDada.set(dono, hoje);
          await enviarWhatsApp(fone, "Oi! Por este número você manda coisas para o *Conhecimento* do Nipëi (a gestão revisa antes de valer):\n• comece a mensagem com *conhecimento:* e escreva o que todos precisam saber, ou\n• encaminhe uma mensagem, um áudio, uma foto ou um PDF e responda *sim* quando eu perguntar.");
        }
        return;
      }
    }

    const decisao = lerDecisao(texto);
    const ultima = [...getConversa(dono)].reverse().find((m) => m.role === "assistant");
    if (decisao && ultima && resumoCartoes(ultima).length) {
      registrarEvento(dono, decisao === "nenhuma" ? "cancelou proposta" : "confirmou proposta", `pelo WhatsApp (${Array.isArray(decisao) ? decisao.join(", ") : decisao})`, "whatsapp");
      await enviarWhatsApp(fone, await decidir(me, dono, quem, decisao)); return;
    }
    registrarEvento(dono, audio ? "mandou áudio" : "mandou mensagem", "para o número do Nipëi", "whatsapp");

    contarUso(dono);
    const msgs = [...getConversa(dono), { role: "user" as const, content: audio ? `🎤 ${texto}` : texto.slice(0, 4000), em: new Date().toISOString() }];
    const r = await conversar(me, paraModelo(msgs), "pt", "/whatsapp");
    const cartoes = r.acoes.map((a) => ({ ...a, estado: "pendente" as const }));
    msgs.push({ role: "assistant", content: r.resposta, em: new Date().toISOString(), ...(r.consultas.length ? { consultas: r.consultas } : {}), cartoes });
    salvarConversa(dono, msgs);
    const lista = cartoes.map((c, i) => `${i + 1}. ${c.resumo}${c.detalhe ? ` — ${c.detalhe.slice(0, 160)}` : ""}`).join("\n");
    // with proposals, the only numbered list is ours (the numbers the person answers with): drop the model's own
    // list and its "responda sim/não" so nothing contradicts it
    const fala = cartoes.length
      ? paraWhats(r.resposta).split("\n").filter((l) => !/^\s*\d+[.)]\s/.test(l)).join("\n").replace(/[^.!?\n]*\bresponda\b[^.!?\n]*[.!?]?/gi, "").replace(/\n{3,}/g, "\n\n").trim()
      : paraWhats(r.resposta);
    const como = cartoes.length > 1 ? "Responda *sim* para confirmar todas, os *números* que quiser (ex.: 1 3) ou *não*." : "Responda *sim* para confirmar ou *não*.";
    const resposta = [audio ? `🎤 _${texto.slice(0, 300)}${texto.length > 300 ? "…" : ""}_` : "", fala,
      cartoes.length ? `*Propostas:*\n${lista}\n\n${como} Também dá para confirmar no app.` : ""].filter(Boolean).join("\n\n");
    await enviarWhatsApp(fone, resposta.slice(0, 3500));
  } catch (e) {
    await enviarWhatsApp(fone, `Não consegui agora: ${(e as Error).message.slice(0, 200)}`);
  }
}
