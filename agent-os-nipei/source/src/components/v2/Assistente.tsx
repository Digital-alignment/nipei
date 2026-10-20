"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Mic, Send, X } from "lucide-react";
import { assistenteAction, executarAcaoAction } from "@/app/(v2)/actions";
import Md from "@/components/v2/Md";
import type { AcaoProposta, Msg } from "@/lib/v2/assistente";

type Labels = { placeholder: string; ouvindo: string; confirmar: string; cancelar: string; feito: string; limpar: string; pensando: string; sugestoes: string[]; verConversa: string };
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};
type Cartao = AcaoProposta & { estado: "pendente" | "feito" | "cancelado" | "erro"; erro?: string };

const CHAVE = "nipei:assistente";

/**
 * Ask or tell (typing or by voice): the assistant reads the platform and proposes changes as cards;
 * nothing changes until "Confirmar". The conversation lives in this tab only (sessionStorage).
 */
export default function Assistente({ lang, labels }: { lang: "pt" | "en"; labels: Labels }) {
  const [texto, setTexto] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [erro, setErro] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    try { const v = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null"); if (v) { setMsgs(v.msgs ?? []); setCartoes(v.cartoes ?? []); } } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ msgs: msgs.slice(-12), cartoes })); } catch { /* ignore */ }
  }, [msgs, cartoes]);

  function enviar(conteudo: string) {
    const q = conteudo.trim();
    if (!q || pending) return;
    const historico: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(historico);
    setTexto("");
    setErro("");
    setRecolhido(false);
    start(async () => {
      const r = await assistenteAction(historico).catch(() => ({ error: "Falha de conexão" } as { error: string }));
      if ("error" in r && r.error) return setErro(r.error);
      const ok = r as { resposta: string; acoes: AcaoProposta[] };
      if (ok.resposta) setMsgs((m) => [...m, { role: "assistant", content: ok.resposta }]);
      if (ok.acoes.length) setCartoes((c) => [...c.filter((x) => x.estado === "pendente"), ...ok.acoes.map((a) => ({ ...a, estado: "pendente" as const }))]);
    });
  }

  function falar() {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return setErro("Voz indisponível neste navegador");
    if (ouvindo) return rec.current?.stop();
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

  function decidir(i: number, confirmar: boolean) {
    const c = cartoes[i];
    if (!confirmar) return setCartoes((cs) => cs.map((x, j) => (j === i ? { ...x, estado: "cancelado" } : x)));
    start(async () => {
      const r = await executarAcaoAction(c).catch(() => ({ error: "Falha de conexão" }));
      setCartoes((cs) => {
        const novos = cs.map((x, j) => (j === i ? { ...x, estado: r.error ? "erro" as const : "feito" as const, erro: r.error } : x));
        // once nothing is waiting for a decision, fold the panel so the list comes back up
        if (!r.error && !novos.some((x) => x.estado === "pendente")) setRecolhido(true);
        return novos;
      });
    });
  }

  const ultimas = msgs.slice(-2);
  const visiveis = cartoes.filter((c) => c.estado !== "cancelado").slice(-5);
  return (
    <div className="mb-4">
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex items-center gap-1.5">
        <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={ouvindo ? labels.ouvindo : labels.placeholder} maxLength={500}
          className="min-w-0 flex-1 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 text-sm" />
        {texto.trim()
          ? <button aria-label="Enviar" disabled={pending} className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center disabled:opacity-50"><Send size={16} /></button>
          : <button type="button" onClick={falar} aria-label={labels.ouvindo} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${ouvindo ? "bg-red-600 text-white animate-pulse" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"}`}><Mic size={16} /></button>}
      </form>

      {!msgs.length && !pending && !cartoes.length && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto -mx-1 px-1">
          {labels.sugestoes.map((s) => (
            <button key={s} type="button" onClick={() => (s.endsWith(": ") ? (setTexto(s), campo.current?.focus()) : enviar(s))}
              className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:border-neutral-400">
              {s.replace(/: $/, "…")}
            </button>
          ))}
        </div>
      )}

      {recolhido && (ultimas.length > 0 || visiveis.length > 0) && (
        <button type="button" onClick={() => setRecolhido(false)} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <span className="text-green-700 dark:text-green-400">✓</span>
          <span className="min-w-0 flex-1 truncate text-left">{[...cartoes].reverse().find((c) => c.estado === "feito")?.resumo ?? ultimas[ultimas.length - 1]?.content}</span>
          <span className="shrink-0 underline">{labels.verConversa}</span>
        </button>
      )}

      {!recolhido && (ultimas.length > 0 || pending || erro || visiveis.length > 0) && (
        <div className="mt-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 grid gap-2 text-sm">
          {ultimas.map((m, i) => (
            m.role === "user" ? <p key={i} className="text-neutral-500 text-xs">› {m.content}</p> : <Md key={i}>{m.content}</Md>
          ))}
          {pending && <p className="text-xs text-neutral-500 animate-pulse">{labels.pensando}</p>}
          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
          {visiveis.map((c) => {
            const i = cartoes.indexOf(c);
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 px-3 py-2 text-xs">
                <span className="min-w-0 flex-1">{c.resumo}{c.estado === "erro" && <span className="block text-red-600 dark:text-red-400">{c.erro}</span>}</span>
                {c.estado === "pendente" ? (
                  <>
                    <button type="button" disabled={pending} onClick={() => decidir(i, true)} className="inline-flex items-center gap-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-1"><Check size={12} />{labels.confirmar}</button>
                    <button type="button" disabled={pending} onClick={() => decidir(i, false)} aria-label={labels.cancelar} className="rounded-md border border-neutral-300 dark:border-neutral-700 p-1"><X size={12} /></button>
                  </>
                ) : c.estado === "feito" ? <span className="text-green-700 dark:text-green-400">✓ {labels.feito}</span> : null}
              </div>
            );
          })}
          <button type="button" onClick={() => { setMsgs([]); setCartoes([]); setErro(""); }} className="justify-self-end text-[11px] text-neutral-400 underline">{labels.limpar}</button>
        </div>
      )}
    </div>
  );
}
