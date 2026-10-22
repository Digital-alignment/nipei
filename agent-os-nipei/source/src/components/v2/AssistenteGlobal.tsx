"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, BotMessageSquare, Brain, Check, CheckCheck, ExternalLink, Mic, RotateCcw, Send, Square, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { assistenteAction, assistenteConversaAction, decidirCartaoAction, esquecerMemoriaAction, memoriaAction, novaConversaAction } from "@/app/(v2)/actions";
import Md from "@/components/v2/Md";
import type { Lembranca, MsgSalva } from "@/lib/v2/assistente";

export const ABRIR_ASSISTENTE = "nipei:assistente"; // window event; detail: { texto?: string }

type Labels = {
  titulo: string; placeholder: string; ouvindo: string; confirmar: string; confirmarTodas: string; cancelar: string; feito: string;
  nova: string; pensando: string; fechar: string; intro: string; abrir: string; semVoz: string;
  memoria: string; memoriaIntro: string; memoriaVazia: string; esquecer: string; categorias: Record<Lembranca["categoria"], string>;
  vozLigar: string; vozDesligar: string; ouvir: string; parar: string; propostasFala: string;
};

const CHAVE_VOZ = "nipei:voz";
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
 * The assistant on every page (Equipe 1): a button bottom-right on desktop, the middle item of the
 * phone bar, or any `window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail: { texto } }))`.
 * It sends the current page with each message; the conversation is stored per person on the server.
 */
export default function AssistenteGlobal({ lang, labels }: { lang: "pt" | "en"; labels: Labels }) {
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
  useEffect(() => { try { const v = localStorage.getItem(CHAVE_VOZ) === "1"; setVoz(v); vozRef.current = v; } catch { /* private mode */ } }, []);

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
      const t = (e as CustomEvent<{ texto?: string }>).detail?.texto;
      if (t) enviar(t);
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

  return (
    <>
      {!aberto && (
        <button type="button" onClick={() => setAberto(true)} aria-label={labels.abrir} title={labels.abrir}
          className="print:hidden hidden md:flex fixed right-6 bottom-6 z-40 w-14 h-14 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg hover:scale-105 transition-transform">
          <BotMessageSquare size={24} />
        </button>
      )}
      {aberto && (
        <>
          <div className="print:hidden md:hidden fixed inset-0 z-[90] bg-black/50" onClick={() => setAberto(false)} aria-hidden />
          <section role="dialog" aria-label={labels.titulo}
            className="print:hidden fixed z-[100] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl
              inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]
              md:inset-auto md:right-6 md:bottom-6 md:w-[420px] md:h-[min(680px,calc(100dvh-7rem))] md:rounded-2xl md:pb-0">
            <header className="flex items-center gap-2 px-4 h-14 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              {memoria !== null
                ? <button type="button" onClick={() => setMemoria(null)} aria-label={labels.titulo} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"><ArrowLeft size={18} /></button>
                : <span className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shrink-0"><BotMessageSquare size={16} /></span>}
              <p className="font-semibold text-sm flex-1">{memoria !== null ? labels.memoria : labels.titulo}</p>
              {memoria === null && (
                <button type="button" onClick={alternarVoz} aria-pressed={voz} title={voz ? labels.vozDesligar : labels.vozLigar} aria-label={voz ? labels.vozDesligar : labels.vozLigar}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${voz ? "bg-green-600/15 text-green-700 dark:text-green-400" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>
                  {voz ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              {memoria === null && <button type="button" onClick={verMemoria} disabled={pending} title={labels.memoria} aria-label={labels.memoria} className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"><Brain size={16} /></button>}
              {memoria === null && !vazio && <button type="button" onClick={nova} disabled={pending} title={labels.nova} aria-label={labels.nova} className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"><RotateCcw size={16} /></button>}
              <button type="button" onClick={() => setAberto(false)} title={labels.fechar} aria-label={labels.fechar} className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={18} /></button>
            </header>

            {memoria !== null ? (
              <div className="flex-1 overflow-y-auto px-4 py-3 grid content-start gap-3 text-sm">
                <p className="text-neutral-500 leading-relaxed">{memoria.length ? labels.memoriaIntro : labels.memoriaVazia}</p>
                {(Object.keys(labels.categorias) as Lembranca["categoria"][]).filter((cat) => memoria.some((x) => x.categoria === cat)).map((cat) => (
                  <div key={cat} className="grid gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{labels.categorias[cat]}</p>
                    {memoria.filter((x) => x.categoria === cat).map((x) => (
                      <div key={x.id} className="flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                        <p className="flex-1 min-w-0">{x.texto}</p>
                        <button type="button" onClick={() => apagar(x.id)} disabled={pending} title={labels.esquecer} aria-label={`${labels.esquecer}: ${x.texto}`} className="shrink-0 text-neutral-400 hover:text-red-600 disabled:opacity-40"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (<>
            <div className="flex-1 overflow-y-auto px-4 py-3 grid content-start gap-3 text-sm">
              {msgs === null && <p className="text-xs text-neutral-500 animate-pulse">{labels.pensando}</p>}
              {vazio && <p className="text-neutral-500 leading-relaxed">{labels.intro}</p>}
              {msgs?.map((m, mi) => m.role === "user" ? (
                <p key={mi} className="justify-self-end max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-2 whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div key={mi} className="grid gap-2 max-w-[95%]">
                  {m.content && <div className="leading-relaxed"><Md>{m.content}</Md></div>}
                  {m.content && (
                    <button type="button" onClick={() => { desbloquear(); if (falando === mi) pararFala(); else { porVoz.current = false; void falarMsg(m, mi); } }}
                      className={`justify-self-start inline-flex items-center gap-1 text-[11px] ${falando === mi ? "text-green-700 dark:text-green-400" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}>
                      {falando === mi ? <><Square size={11} className="fill-current" />{labels.parar}</> : <><Volume2 size={12} />{labels.ouvir}</>}
                    </button>
                  )}
                  {m.cartoes?.map((c, ci) => (
                    <div key={ci} className={`rounded-xl border px-3 py-2.5 grid gap-1 ${c.estado === "pendente" ? "border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30" : "border-neutral-200 dark:border-neutral-800"}`}>
                      <p className={`font-medium ${c.estado === "cancelado" ? "line-through text-neutral-400" : ""}`}>{c.resumo}</p>
                      {c.detalhe && <p className="text-xs text-neutral-500 whitespace-pre-wrap line-clamp-6">{c.detalhe}</p>}
                      {c.estado === "erro" && <p className="text-xs text-red-600 dark:text-red-400">{c.erro}</p>}
                      {c.estado === "pendente" ? (
                        <div className="flex gap-2 mt-1">
                          <button type="button" disabled={pending} onClick={() => decidir(mi, ci, true)} className="inline-flex items-center gap-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs font-medium disabled:opacity-50"><Check size={13} />{labels.confirmar}</button>
                          <button type="button" disabled={pending} onClick={() => decidir(mi, ci, false)} className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs disabled:opacity-50">{labels.cancelar}</button>
                        </div>
                      ) : c.estado === "feito" && (
                        <p className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400"><Check size={13} />{labels.feito}
                          {c.link && <Link href={c.link} onClick={() => setAberto(false)} className="inline-flex items-center gap-0.5 underline text-neutral-500"><ExternalLink size={11} />{labels.abrir}</Link>}
                        </p>
                      )}
                    </div>
                  ))}
                  {(m.cartoes?.filter((c) => c.estado === "pendente").length ?? 0) > 1 && (
                    <button type="button" disabled={pending} onClick={() => todas(mi)} className="justify-self-start inline-flex items-center gap-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs font-medium disabled:opacity-50"><CheckCheck size={13} />{labels.confirmarTodas}</button>
                  )}
                </div>
              ))}
              {pending && msgs !== null && <p className="text-xs text-neutral-500 animate-pulse">{labels.pensando}</p>}
              {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
              <div ref={fim} />
            </div>

            {(vazio || (msgs !== null && !pending && msgs.length < 2)) && (
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 shrink-0">
                {sugestoes.map((x) => (
                  <button key={x} type="button" onClick={() => enviar(x)} disabled={pending}
                    className="shrink-0 whitespace-nowrap rounded-full border border-neutral-200 dark:border-neutral-700 px-3 h-8 text-xs text-neutral-600 dark:text-neutral-300 hover:border-neutral-400">{x}</button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); desbloquear(); porVoz.current = false; if (!pending) enviar(texto); }} className="flex items-end gap-2 px-3 py-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <textarea ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} maxLength={2000}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); desbloquear(); porVoz.current = false; if (!pending) enviar(texto); } }}
                placeholder={ouvindo ? labels.ouvindo : labels.placeholder}
                className="min-w-0 flex-1 resize-none max-h-32 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-2.5 text-sm leading-snug" />
              {texto.trim()
                ? <button aria-label="Enviar" disabled={pending} className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center disabled:opacity-50"><Send size={16} /></button>
                : <button type="button" onClick={falar} aria-label={labels.ouvindo} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${ouvindo ? "bg-red-600 text-white animate-pulse" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"}`}><Mic size={16} /></button>}
            </form>
            </>)}
          </section>
        </>
      )}
    </>
  );
}

/** Hoje's field: same look as before, but it opens the global assistant with what you typed. */
export function CampoAssistente({ placeholder, sugestoes }: { placeholder: string; sugestoes: string[] }) {
  const [texto, setTexto] = useState("");
  const abrir = (t?: string) => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail: { texto: t } }));
  return (
    <div className="mb-4">
      <form onSubmit={(e) => { e.preventDefault(); abrir(texto.trim() || undefined); setTexto(""); }} className="flex items-center gap-1.5">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} maxLength={2000}
          className="min-w-0 flex-1 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 text-sm" />
        <button aria-label={placeholder} className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
          {texto.trim() ? <Send size={16} /> : <BotMessageSquare size={17} />}
        </button>
      </form>
      <div className="flex gap-1.5 mt-2 overflow-x-auto -mx-1 px-1">
        {sugestoes.map((x) => (
          <button key={x} type="button" onClick={() => abrir(x)} className="shrink-0 whitespace-nowrap rounded-full border border-neutral-200 dark:border-neutral-800 px-3 h-8 text-xs text-neutral-600 dark:text-neutral-300 hover:border-neutral-400">{x}</button>
        ))}
      </div>
    </div>
  );
}
