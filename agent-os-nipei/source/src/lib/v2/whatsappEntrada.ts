import { getPessoas, meDaPessoa, type Me, type Pessoa } from "./data";
import { conversar, executarAcao, getConversa, paraModelo, salvarConversa, type MsgSalva } from "./assistente";
import { contarUso } from "./ia";
import { enviarWhatsApp } from "./whatsapp";

// "Encaminhar para o Nipëi": a person writes or forwards a text or voice note to the Nipëi WhatsApp number.
// Same assistant, same conversation and memory as the panel; proposals come back numbered and are confirmed
// by replying "sim", the numbers ("1 3") or "não" (or on the cards in the panel). Only people whose profile
// number matches and who can use the assistant (Equipe 1 today); everyone else is ignored in silence.

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

async function audioBase64(d: Dados): Promise<{ base64: string; mime: string } | null> {
  const a = d.message?.audioMessage as { mimetype?: string } | undefined;
  if (!a) return null;
  if (d.message?.base64) return { base64: d.message.base64, mime: a.mimetype || "audio/ogg" };
  const { EVOLUTION_API_URL: url, EVOLUTION_API_KEY: key, EVOLUTION_INSTANCE_NAME: inst } = process.env;
  const r = await fetch(`${url}/chat/getBase64FromMediaMessage/${inst}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: key ?? "" }, body: JSON.stringify({ message: { key: d.key }, convertToMp4: false }), signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  return j?.base64 ? { base64: j.base64, mime: (j.mimetype || a.mimetype || "audio/ogg").split(";")[0] } : null;
}

/** Voice note → text (Gemini; NIPEI_TRANSCRICAO_MODEL, default the current flash-lite). */
export async function transcrever(base64: string, mime: string): Promise<string> {
  const modelo = process.env.NIPEI_TRANSCRICAO_MODEL || "gemini-flash-lite-latest";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: "Transcreva este áudio exatamente, no idioma falado. Responda só com a transcrição." }, { inline_data: { mime_type: mime.split(";")[0], data: base64 } }] }] }),
  });
  if (!r.ok) throw new Error(`transcrição falhou (${r.status})`);
  const j = await r.json();
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

/** Handles one Evolution "messages.upsert" (called in the background by the webhook). */
export async function processarEntrada(d: Dados): Promise<void> {
  const k = d.key ?? {};
  if (k.fromMe || !k.remoteJid || /@(g\.us|broadcast|newsletter)$/.test(k.remoteJid) || (k.id && vistos.has(k.id))) return;
  if (k.id) { vistos.add(k.id); if (vistos.size > 1000) vistos.delete(vistos.values().next().value!); }
  const p = remetente(k);
  const me = p ? meDaPessoa(p.id) : null;
  if (!p || !me?.gestao) return; // unknown number, no access, or not allowed to use the assistant yet
  const fone = p.whatsapp, quem = `${p.name.split(" (")[0]} (via WhatsApp)`, dono = p.id;
  try {
    let texto = textoDe(d.message);
    const audio = !texto ? await audioBase64(d) : null;
    if (audio) texto = await transcrever(audio.base64, audio.mime);
    if (!texto) { await enviarWhatsApp(fone, "Por enquanto eu entendo texto e áudio. 🙏"); return; }

    const decisao = lerDecisao(texto);
    const ultima = [...getConversa(dono)].reverse().find((m) => m.role === "assistant");
    if (decisao && ultima && resumoCartoes(ultima).length) { await enviarWhatsApp(fone, await decidir(me, dono, quem, decisao)); return; }

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
