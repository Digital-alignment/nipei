"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { assistenteAction, assistenteConversaAction, decidirCartaoAction, esquecerMemoriaAction, memoriaAction, novaConversaAction } from "@/app/(v2)/actions";
import Md from "@/components/v2/Md";
import Campo from "@/components/ds/Campo";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Icone from "@/components/ds/Icone";
import Cartao from "@/components/ds/Cartao";
import MenuAcoes from "@/components/ds/MenuAcoes";
import { MiniAnelPinu, OrbePinu, type EstadoPinu } from "@/components/ds/Pinu";
import { Skeleton } from "@/components/ds/Estados";
import type { Lembranca, MsgSalva } from "@/lib/v2/assistente";

export const ABRIR_ASSISTENTE = "nipei:assistente"; // window event; detail: { texto?: string }

type Labels = {
  titulo: string; placeholder: string; ouvindo: string; confirmar: string; confirmarTodas: string; cancelar: string; feito: string;
  nova: string; pensando: string; fechar: string; intro: string; abrir: string; semVoz: string;
  memoria: string; memoriaIntro: string; memoriaVazia: string; esquecer: string; categorias: Record<Lembranca["categoria"], string>;
  vozLigar: string; vozDesligar: string; ouvir: string; parar: string; propostasFala: string;
  oi: string; ajudar: string; recentes: string; falarPinu: string; enviar: string; gerarOutra: string; editarPergunta: string; maisOpcoes: string;
  copiar: string; proposta: string; propostas: string; ajustar: string; ajustarTexto: string;
};

const CHAVE_VOZ = "nipei:voz";
const CHAVE_RECENTES = "nipei:pinu:recentes"; // últimas perguntas neste aparelho (início do Pinu)
const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

/** What gets read aloud: plain sentences, no markdown, cut at a sentence near ~600 chars; cards are announced. */
function paraFala(m: MsgSalva, propostasFala: string) {
  let t = m.content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>|]/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/\n+/g, ". ").replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim();
  if (t.length > 600) { const corte = t.slice(0, 600).lastIndexOf(". "); t = t.slice(0, corte > 200 ? corte + 1 : 600); }
  const n = m.cartoes?.filter((c) => c.estado === "pendente").length ?? 0;
  return n ? `${t} ${propostasFala.replace("{n}", String(n))}`.trim() : t;
}
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};

// what to suggest depends on the page you are on
const SUGESTOES: Record<string, { pt: string[]; en: string[] }> = {
  tarefas: { pt: ["Resuma esta tarefa", "Mude o prazo desta tarefa para sexta", "O que falta para concluir?"], en: ["Summarise this task", "Move this task to Friday", "What is left to finish it?"] },
  projetos: { pt: ["Como está este projeto?", "O que está atrasado aqui?", "Planeje as próximas 2 semanas"], en: ["How is this project doing?", "What is overdue here?", "Plan the next 2 weeks"] },
  equipes: { pt: ["Quem está sobrecarregado?", "Tarefas sem responsável", "Pauta para a reunião da equipe"], en: ["Who is overloaded?", "Tasks without owner", "Agenda for the team meeting"] },
  pessoas: { pt: ["O que esta pessoa tem atrasado?", "Escreva um WhatsApp para ela"], en: ["What does this person have overdue?", "Write them a WhatsApp"] },
  conhecimento: { pt: ["Fatos para eu revisar", "O que sabemos sobre os retiros?"], en: ["Facts for me to review", "What do we know about the retreats?"] },
  financas: { pt: ["Resumo do mês", "Maiores despesas do mês"], en: ["Summary of the month", "Biggest expenses this month"] },
  agenda: { pt: ["Como está minha semana?", "Reprograme minhas atrasadas", "Dê prazo às minhas tarefas sem data"], en: ["How does my week look?", "Reschedule my overdue tasks", "Give dates to my undated tasks"] },
  hoje: { pt: ["O que tenho hoje?", "Resumo da minha semana", "Como vai a missão da semana?"], en: ["What do I have today?", "Summary of my week", "How is the mission of the week going?"] },
};

/**
 * The assistant on every page (Equipe 1), with the Pinu identity (DESIGN-SYSTEM.md 10.11): full screen on the
 * phone, side panel on desktop. Opened by the orb (menu / phone bar), the header field, Hoje's field or any
 * `window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail: { texto } }))`.
 * It sends the current page with each message; the conversation is stored per person on the server.
 */
export default function AssistenteGlobal({ lang, nome, labels }: { lang: "pt" | "en"; nome: string; labels: Labels }) {
  const path = usePathname() ?? "/hoje";
  const busca = useSearchParams();
  const pagina = path + (busca?.toString() ? `?${busca}` : "");
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<MsgSalva[] | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [memoria, setMemoria] = useState<Lembranca[] | null>(null); // null = chat view
  const [voz, setVoz] = useState(false);          // read replies aloud (remembered on this device)
  const [falando, setFalando] = useState(-1);     // index of the message being read
  const [pending, start] = useTransition();
  const audio = useRef<HTMLAudioElement | null>(null);
  const vozRef = useRef(false);
  const porVoz = useRef(false);                   // last question was spoken → keep the conversation going
  const ouvirDeNovo = useRef<() => void>(() => {});
  const [recentes, setRecentes] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = localStorage.getItem(CHAVE_VOZ) === "1"; setVoz(v); vozRef.current = v;
      setRecentes(JSON.parse(localStorage.getItem(CHAVE_RECENTES) ?? "[]"));
    } catch { /* private mode */ }
  }, []);

  // Phones only play audio started by a tap: unlock one <audio> element on the first tap and reuse it.
  const desbloquear = () => {
    if (!audio.current) audio.current = new Audio();
    const a = audio.current;
    if (!a.src) { a.src = SILENCIO; a.play().catch(() => {}); }
  };
  const pararFala = () => {
    audio.current?.pause();
    try { window.speechSynthesis?.cancel(); } catch { /* none */ }
    setFalando(-1);
  };
  const falarMsg = useCallback(async (m: MsgSalva, idx: number) => {
    const texto = paraFala(m, labels.propostasFala);
    if (!texto) return;
    pararFala();
    setFalando(idx);
    const fim = () => { setFalando(-1); if (porVoz.current && vozRef.current) ouvirDeNovo.current(); };
    try {
      const r = await fetch("/api/assistente/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, lang }) });
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      if (!audio.current) audio.current = new Audio();
      const a = audio.current;
      a.onended = () => { URL.revokeObjectURL(url); fim(); };
      a.src = url;
      await a.play();
    } catch {
      // fallback: the device's own voice (instant, free, less natural)
      try {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = lang === "en" ? "en-US" : "pt-BR";
        u.onend = fim;
        window.speechSynthesis.speak(u);
      } catch { setFalando(-1); }
    }
  }, [lang, labels.propostasFala]);
  const alternarVoz = () => {
    desbloquear();
    const v = !voz;
    setVoz(v); vozRef.current = v;
    try { localStorage.setItem(CHAVE_VOZ, v ? "1" : "0"); } catch { /* private mode */ }
    if (!v) pararFala();
  };
  const campo = useRef<HTMLTextAreaElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);

  const carregar = useCallback(() => start(async () => {
    const r = await assistenteConversaAction().catch(() => ({ error: "Falha de conexão" } as { error: string }));
    if ("error" in r && r.error) return setErro(r.error);
    setMsgs((r as { msgs: MsgSalva[] }).msgs);
  }), []);

  const enviar = useCallback((conteudo: string) => {
    const q = conteudo.trim();
    if (!q) return;
    setTexto(""); setErro("");
    setMsgs((m) => [...(m ?? []), { role: "user", content: q, em: new Date().toISOString() }]);
    setRecentes((r) => { const n = [q.slice(0, 140), ...r.filter((x) => x !== q.slice(0, 140))].slice(0, 4); try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify(n)); } catch { /* private mode */ } return n; });
    start(async () => {
      const r = await assistenteAction(q, pagina).catch(() => ({ error: "Falha de conexão" } as { error: string }));
      if ("error" in r && r.error) return setErro(r.error);
      const novas = (r as { msgs: MsgSalva[] }).msgs;
      setMsgs(novas);
      const ultima = novas.length - 1;
      if (vozRef.current && novas[ultima]?.role === "assistant") void falarMsg(novas[ultima], ultima);
    });
  }, [pagina, falarMsg]);

  // open from anywhere (phone bar, Hoje's field), optionally with a first message
  useEffect(() => {
    const abrir = (e: Event) => {
      setAberto(true);
      const d = (e as CustomEvent<{ texto?: string; voz?: boolean }>).detail;
      if (d?.texto) enviar(d.texto);
      else if (d?.voz) ouvirDeNovo.current(); // microfone do campo do cabeçalho
    };
    window.addEventListener(ABRIR_ASSISTENTE, abrir);
    return () => window.removeEventListener(ABRIR_ASSISTENTE, abrir);
  }, [enviar]);
  useEffect(() => { if (aberto && msgs === null) carregar(); }, [aberto, msgs, carregar]);
  useEffect(() => { if (aberto) setTimeout(() => campo.current?.focus(), 50); else { audio.current?.pause(); try { window.speechSynthesis?.cancel(); } catch { /* none */ } rec.current?.stop(); } }, [aberto]);
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [msgs, pending, aberto]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  function falar() {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return setErro(labels.semVoz);
    if (ouvindo) { porVoz.current = false; return rec.current?.stop(); }
    desbloquear();
    pararFala();
    porVoz.current = true;
    const r = new SR();
    r.lang = lang === "en" ? "en-US" : "pt-BR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => enviar(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setOuvindo(false);
    r.onerror = () => setOuvindo(false);
    rec.current = r;
    setOuvindo(true);
    r.start();
  }
  ouvirDeNovo.current = falar;

  const decidir = (mi: number, ci: number, confirmar: boolean) => start(async () => {
    const r = await decidirCartaoAction(mi, ci, confirmar).catch(() => ({ error: "Falha de conexão" } as { error: string }));
    if ("error" in r && r.error) return setErro(r.error);
    setMsgs((r as { msgs: MsgSalva[] }).msgs);
  });
  const todas = (mi: number) => start(async () => {
    const cs = msgs?.[mi]?.cartoes ?? [];
    let ultimo: MsgSalva[] | null = null;
    for (let ci = 0; ci < cs.length; ci++) {
      if (cs[ci].estado !== "pendente") continue;
      const r = await decidirCartaoAction(mi, ci, true).catch(() => null);
      if (r && "msgs" in r && r.msgs) ultimo = r.msgs;
    }
    if (ultimo) setMsgs(ultimo);
  });
  const verMemoria = () => start(async () => {
    const r = await memoriaAction().catch(() => ({ error: "Falha de conexão" } as { error: string }));
    if ("error" in r && r.error) return setErro(r.error);
    setMemoria((r as { itens: Lembranca[] }).itens);
  });
  const apagar = (item: string) => start(async () => {
    const r = await esquecerMemoriaAction(item).catch(() => null);
    if (r && "itens" in r && r.itens) setMemoria(r.itens);
  });
  const nova = () => start(async () => {
    const r = await novaConversaAction();
    if ("msgs" in r && r.msgs) setMsgs(r.msgs);
  });

  const secao = path.split("/")[1] || "hoje";
  const sugestoes = (SUGESTOES[secao] ?? SUGESTOES.hoje)[lang];
  const vazio = msgs !== null && msgs.length === 0;
  const estadoOrbe: EstadoPinu = ouvindo ? "ouvindo" : falando >= 0 ? "falando" : pending ? "pensando" : "repouso";
  const ultimaPergunta = [...(msgs ?? [])].reverse().find((m) => m.role === "user")?.content ?? "";
  const ultimaResposta = msgs ? msgs.map((m) => m.role).lastIndexOf("assistant") : -1;
  const ajustar = (resumo: string) => { setTexto(`${labels.ajustarTexto} ${resumo}: `); setTimeout(() => campo.current?.focus(), 30); };
  const cancelarTodas = (mi: number) => start(async () => {
    const cs = msgs?.[mi]?.cartoes ?? [];
    let ultimo: MsgSalva[] | null = null;
    for (let ci = 0; ci < cs.length; ci++) {
      if (cs[ci].estado !== "pendente") continue;
      const r = await decidirCartaoAction(mi, ci, false).catch(() => null);
      if (r && "msgs" in r && r.msgs) ultimo = r.msgs;
    }
    if (ultimo) setMsgs(ultimo);
  });

  // campo do Pinu: grande no início, em pílula na conversa; ouvindo = o orbe toma o lugar do texto
  const campoPinu = (grande: boolean) => (
    <form onSubmit={(e) => { e.preventDefault(); desbloquear(); porVoz.current = false; if (!pending) enviar(texto); }}
      className={`flex shrink-0 gap-2 bg-s2 shadow-brilho-ia transition-shadow focus-within:shadow-foco ${grande ? "flex-col rounded-[22px] p-3" : "items-end rounded-[26px] p-1.5 pl-4"}`}>
      {ouvindo ? (
        <span className="flex min-h-11 flex-1 items-center gap-3" aria-live="polite">
          <OrbePinu estado="ouvindo" tamanho={40} /><span className="corpo text-t1">{labels.ouvindo}</span>
        </span>
      ) : (
        <textarea ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} rows={grande ? 2 : 1} maxLength={2000} aria-label={labels.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); desbloquear(); porVoz.current = false; if (!pending) enviar(texto); } }}
          placeholder={labels.placeholder}
          className={`min-w-0 flex-1 resize-none bg-transparent font-texto text-[15px] leading-snug text-t1 outline-none placeholder:text-t3 ${grande ? "min-h-12" : "max-h-32 min-h-11 self-center py-2.5"}`} />
      )}
      <span className="flex items-center justify-end gap-1.5">
        {texto.trim() && !ouvindo
          ? <BotaoIcone type="submit" icone="enviar" aria-label={labels.enviar} tamanho={44} variante="acento" disabled={pending} />
          : <BotaoIcone icone={ouvindo ? "fechar" : "microfone"} aria-label={ouvindo ? labels.parar : labels.falarPinu} tamanho={44} variante="acento" onClick={falar} />}
      </span>
    </form>
  );

  return (
    <>
      {aberto && (
        <section role="dialog" aria-modal="true" aria-label={labels.titulo}
          className="print:hidden fixed inset-0 z-[100] flex flex-col pb-[env(safe-area-inset-bottom)] text-t1 md:inset-y-0 md:left-auto md:right-0 md:w-[460px] md:shadow-[-1px_0_0_var(--s3)]"
          // fundo com gradiente verde/oliva vindo do topo (mais forte no início, discreto na conversa)
          style={{ background: `radial-gradient(130% ${vazio ? "55%" : "28%"} at 50% -5%, color-mix(in srgb, var(--ac) ${vazio ? 34 : 20}%, transparent), transparent 75%), var(--bg)` }}>
          <header className="flex h-16 shrink-0 items-center gap-2 px-3">
            {memoria !== null
              ? <BotaoIcone icone="voltar" aria-label={labels.titulo} tamanho={44} variante="fantasma" onClick={() => setMemoria(null)} />
              : <BotaoIcone icone="fechar" aria-label={labels.fechar} tamanho={44} variante="fantasma" onClick={() => setAberto(false)} />}
            <span className="mx-auto inline-flex items-center gap-2 rounded-pilula bg-s1/70 py-1.5 pl-1.5 pr-3.5 font-display text-[15px] font-semibold">
              {estadoOrbe === "repouso" ? <MiniAnelPinu tamanho={24} /> : <OrbePinu estado={estadoOrbe} tamanho={24} />}
              {memoria !== null ? labels.memoria : "Pinu"}
            </span>
            {memoria === null ? (
              <MenuAcoes rotulo={labels.maisOpcoes} itens={[
                { icone: "microfone", rotulo: voz ? labels.vozDesligar : labels.vozLigar, onSelect: alternarVoz },
                { icone: "informacao", rotulo: labels.memoria, onSelect: verMemoria },
                ...(!vazio ? [{ icone: "mais" as const, rotulo: labels.nova, onSelect: nova }] : []),
              ]} />
            ) : <span className="size-11" />}
          </header>

          {memoria !== null ? (
            <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">
              <p className="corpo text-t2">{memoria.length ? labels.memoriaIntro : labels.memoriaVazia}</p>
              {(Object.keys(labels.categorias) as Lembranca["categoria"][]).filter((cat) => memoria.some((x) => x.categoria === cat)).map((cat) => (
                <div key={cat} className="grid gap-2">
                  <p className="rotulo-maiusculo text-t3">{labels.categorias[cat]}</p>
                  {memoria.filter((x) => x.categoria === cat).map((x) => (
                    <div key={x.id} className="flex items-center gap-2 rounded-[16px] bg-s1 py-1.5 pl-4 pr-1.5">
                      <p className="corpo min-w-0 flex-1">{x.texto}</p>
                      <BotaoIcone icone="fechar" aria-label={`${labels.esquecer}: ${x.texto}`} tamanho={40} variante="fantasma" onClick={() => apagar(x.id)} disabled={pending} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : vazio ? (
            // início: saudação em dois tons · bento (Falar com o Pinu em folha = o destaque) · Recentes · campo grande
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
              <h2 className="saudacao mt-2"><span className="text-t1">{labels.oi}, {nome}.</span><br /><span className="text-t2">{labels.ajudar}</span></h2>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={falar}
                  className="anel-foco row-span-2 flex min-h-[216px] flex-col justify-between rounded-[8px_32px_8px_32px] bg-ac p-4 text-left text-ac-ink transition-[filter] hover:brightness-[.96]">
                  <OrbePinu estado={ouvindo ? "ouvindo" : "repouso"} tamanho={44} />
                  <span className="font-display text-2xl font-semibold leading-tight">{labels.falarPinu}</span>
                  <span className="grid size-11 place-items-center self-end rounded-pilula bg-ac-ink text-ac"><Icone nome="microfone" tamanho={20} /></span>
                </button>
                {sugestoes.slice(0, 2).map((x) => (
                  <button key={x} type="button" onClick={() => enviar(x)} disabled={pending}
                    className="anel-foco flex min-h-[104px] flex-col justify-between gap-3 rounded-[18px] bg-s1/90 p-3.5 text-left hover:bg-s2">
                    <Icone nome="mensagem" tamanho={18} className="text-ac-text" />
                    <span className="font-texto text-sm font-medium leading-snug text-t1">{x}</span>
                  </button>
                ))}
              </div>
              {recentes.length > 0 && (
                <div className="grid gap-2">
                  <p className="titulo-cartao">{labels.recentes}</p>
                  {recentes.map((r) => (
                    <button key={r} type="button" onClick={() => enviar(r)} disabled={pending}
                      className="anel-foco flex min-h-11 items-center gap-2.5 rounded-[14px] bg-s1 px-3 text-left font-texto text-sm text-t2 hover:bg-s2 hover:text-t1">
                      <Icone nome="mensagem" tamanho={18} className="shrink-0 text-ac-text" /><span className="min-w-0 flex-1 truncate">{r}</span><Icone nome="avancar" tamanho={16} className="shrink-0 text-t3" />
                    </button>
                  ))}
                </div>
              )}
              <p className="meta text-t3">{labels.intro}</p>
              {erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{erro}</p>}
              <div className="mt-auto">{campoPinu(true)}</div>
            </div>
          ) : (<>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3" aria-live="polite">
              {msgs === null && <div className="grid gap-2"><Skeleton largura="70%" /><Skeleton largura="40%" /></div>}
              {msgs?.map((m, mi) => m.role === "user" ? (
                // a pessoa: balão tonal à direita
                <p key={mi} className="max-w-[80%] self-end whitespace-pre-wrap rounded-[18px_18px_6px_18px] bg-s3 px-3.5 py-2.5 font-texto text-[15px] text-t1">{m.content}</p>
              ) : (
                <div key={mi} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 font-display text-sm font-semibold">
                    {falando === mi ? <OrbePinu estado="falando" tamanho={20} /> : <MiniAnelPinu tamanho={18} />}Pinu
                  </span>
                  {m.content && (
                    // o Pinu: balão tingido de verde à esquerda
                    <div className="max-w-[88%] self-start rounded-[18px_18px_18px_6px] px-3.5 py-2.5 font-texto text-[15px] leading-relaxed text-t1 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ac)_14%,transparent)]"
                      style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--ac) 16%, transparent), var(--s1) 80%)" }}>
                      <Md>{m.content}</Md>
                    </div>
                  )}
                  {(m.cartoes?.length ?? 0) > 0 && (() => {
                    const cs = m.cartoes!;
                    const pend = cs.filter((c) => c.estado === "pendente").length;
                    return (
                      // cartão de proposta: título + "Proposta" · o que será feito · Confirmar / Ajustar / Cancelar
                      <Cartao variante="pinu" className="max-w-[94%] self-start">
                        <div className="flex items-center gap-2">
                          <Icone nome="tarefa" tamanho={20} className="text-ac-text" />
                          <span className="titulo-cartao min-w-0 flex-1">{cs.length === 1 ? cs[0].resumo : labels.propostas.replace("{n}", String(cs.length))}</span>
                          {pend > 0 ? <BadgeEstado estado="andamento">{labels.proposta}</BadgeEstado> : <BadgeEstado estado="feita">{labels.feito}</BadgeEstado>}
                        </div>
                        <ul className="grid gap-2">
                          {cs.map((c, ci) => (
                            <li key={ci} className="flex items-start gap-2.5">
                              <span className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-pilula ${c.estado === "feito" ? "bg-ac text-ac-ink" : c.estado === "erro" ? "bg-err-bg text-err" : "shadow-[inset_0_0_0_2px_var(--s4)]"}`}>
                                {c.estado === "feito" && <Icone nome="confirmar" tamanho={12} />}{c.estado === "erro" && <Icone nome="erro" tamanho={12} />}
                              </span>
                              <span className="grid min-w-0 flex-1 gap-0.5">
                                {cs.length > 1 && <span className={`font-texto text-sm font-medium ${c.estado === "cancelado" ? "text-t3 line-through" : "text-t1"}`}>{c.resumo}</span>}
                                {c.detalhe && <span className="meta line-clamp-4 whitespace-pre-wrap text-t2">{c.detalhe}</span>}
                                {c.estado === "erro" && <span className="meta text-err">{c.erro}</span>}
                                {c.estado === "feito" && c.link && <Link href={c.link} onClick={() => setAberto(false)} className="meta inline-flex items-center gap-1 text-ac-text underline"><Icone nome="abrir-fora" tamanho={14} />{labels.abrir}</Link>}
                              </span>
                              {c.estado === "pendente" && cs.length > 1 && <BotaoIcone icone="fechar" aria-label={`${labels.cancelar}: ${c.resumo}`} tamanho={40} variante="fantasma" disabled={pending} onClick={() => decidir(mi, ci, false)} />}
                            </li>
                          ))}
                        </ul>
                        {pend > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <Botao type="button" icone="confirmar" tamanho="M" carregando={pending} onClick={() => (pend > 1 ? todas(mi) : decidir(mi, cs.findIndex((c) => c.estado === "pendente"), true))}>{pend > 1 ? labels.confirmarTodas : labels.confirmar}</Botao>
                            <Botao type="button" variante="tonal" icone="editar" tamanho="M" desativado={pending} onClick={() => ajustar(cs.length === 1 ? cs[0].resumo : labels.propostas.replace("{n}", String(cs.length)))}>{labels.ajustar}</Botao>
                            <Botao type="button" variante="fantasma" icone="fechar" tamanho="M" desativado={pending} onClick={() => cancelarTodas(mi)}>{labels.cancelar}</Botao>
                          </div>
                        )}
                      </Cartao>
                    );
                  })()}
                  {m.content && (
                    // ações da resposta: gerar outra · editar (a pergunta) · ⋯ (ouvir, copiar)
                    <div className="-ml-2 flex items-center gap-0.5 text-t3">
                      {mi === ultimaResposta && ultimaPergunta && <BotaoIcone icone="gerar-outra" aria-label={labels.gerarOutra} tamanho={40} variante="fantasma" disabled={pending} onClick={() => enviar(ultimaPergunta)} />}
                      {mi === ultimaResposta && ultimaPergunta && <BotaoIcone icone="editar" aria-label={labels.editarPergunta} tamanho={40} variante="fantasma" onClick={() => { setTexto(ultimaPergunta); setTimeout(() => campo.current?.focus(), 30); }} />}
                      <MenuAcoes rotulo={labels.maisOpcoes} alinhar="esquerda" itens={[
                        falando === mi
                          ? { icone: "fechar", rotulo: labels.parar, onSelect: pararFala }
                          : { icone: "microfone", rotulo: labels.ouvir, onSelect: () => { desbloquear(); porVoz.current = false; void falarMsg(m, mi); } },
                        { icone: "baixar", rotulo: labels.copiar, onSelect: () => { void navigator.clipboard?.writeText(m.content); } },
                      ]} />
                    </div>
                  )}
                </div>
              ))}
              {pending && msgs !== null && (
                // pensando: mini-orbe + frase + skeleton de 2 linhas
                <div className="grid gap-2">
                  <span className="flex items-center gap-2 font-display text-sm font-semibold"><OrbePinu estado="pensando" tamanho={20} />{labels.pensando}</span>
                  <Skeleton largura="70%" altura={10} /><Skeleton largura="40%" altura={10} />
                </div>
              )}
              {erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{erro}</p>}
              <div ref={fim} />
            </div>

            {falando >= 0 && (
              <div className="mx-4 mb-2 flex shrink-0 items-center gap-3 rounded-pilula bg-s1 py-1 pl-2 pr-1">
                <OrbePinu estado="falando" tamanho={32} /><span className="meta flex-1 text-t2">Pinu</span>
                <Botao type="button" variante="fantasma" tamanho="P" icone="fechar" onClick={pararFala}>{labels.parar}</Botao>
              </div>
            )}
            {msgs !== null && !pending && (
              // continuações sugeridas, acima do campo
              <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2">
                {sugestoes.map((x) => <Chip key={x} icone="mensagem" onClick={() => enviar(x)}>{x}</Chip>)}
              </div>
            )}
            <div className="shrink-0 px-3 pb-3">{campoPinu(false)}</div>
          </>)}
        </section>
      )}
    </>
  );
}

/** Hoje's field: the design system's Pinu search field + suggestion chips; opens the global assistant. */
export function CampoAssistente({ placeholder, sugestoes }: { placeholder: string; sugestoes: string[] }) {
  const [texto, setTexto] = useState("");
  const abrir = (detail?: { texto?: string; voz?: boolean }) => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail }));
  return (
    <div className="grid gap-2.5">
      <form role="search" onSubmit={(e) => { e.preventDefault(); abrir({ texto: texto.trim() || undefined }); setTexto(""); }}>
        <Campo tipo="busca" pinu rotulo={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} onMicrofone={() => abrir({ voz: true })} />
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {sugestoes.map((x) => <Chip key={x} tipo="pinu" onClick={() => abrir({ texto: x })}>{x}</Chip>)}
      </div>
    </div>
  );
}
