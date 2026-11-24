"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { assistenteAction, decidirTodasAction } from "@/app/(v2)/actions";
import type { MsgSalva } from "@/lib/v2/assistente";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { MiniAnelPinu } from "@/components/ds/Pinu";
import Md from "@/components/v2/Md";
import { abrirPinu } from "@/components/v2/PedirPinu";

// The Pinu inside a Radar card (DS 10.29): the question goes to the person's conversation (the same as the panel)
// pinned to the task page, and the answer + proposals show up right here. Nothing is applied without "Confirmar".

export type TextosPinuCartao = {
  diga: string; digaPrefixo: string; falar: string; parar: string; ouvindo: string; pensando: string; verTudo: string;
  confirmarTodas: string; confirmar: string; cancelar: string; continuar: string; feito: string; cancelada: string; erro: string;
};

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function PinuNoCartao({ titulo, pagina, sugestoes, linhaAcima, direita, lang, t }: {
  titulo: string; pagina: string; sugestoes: { rotulo: string; texto: string }[];
  /** replaces the suggestions row (the Radar's postpone options) */
  linhaAcima?: ReactNode;
  /** the card's own buttons to the right of the field (Adiar, Concluir) */
  direita: ReactNode;
  lang: "pt" | "en"; t: TextosPinuCartao;
}) {
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const [resposta, setResposta] = useState<{ mi: number; msg: MsgSalva } | null>(null);
  const [decidindo, setDecidindo] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => () => rec.current?.stop(), []);

  const assunto = { titulo, href: pagina };
  const prefixo = t.digaPrefixo.replace("{t}", titulo);
  const perguntar = async (q: string) => {
    const p = q.trim();
    if (!p || pensando) return;
    setTexto(""); setErro(""); setPensando(true); setResposta(null);
    const r = await assistenteAction(p, pagina).catch(() => ({ error: "Falha de conexão" }));
    setPensando(false);
    if ("error" in r && r.error) return setErro(r.error);
    const msgs = (r as { msgs: MsgSalva[] }).msgs, mi = msgs.length - 1;
    if (msgs[mi]?.role === "assistant") setResposta({ mi, msg: msgs[mi] });
  };
  const decidir = async (confirmar: boolean) => {
    if (!resposta) return;
    setDecidindo(true);
    const r = await decidirTodasAction(resposta.mi, confirmar).catch(() => ({ error: "Falha de conexão" }));
    setDecidindo(false);
    if ("error" in r && r.error) return setErro(r.error);
    const m = (r as { msgs: MsgSalva[] }).msgs[resposta.mi];
    if (m) setResposta({ mi: resposta.mi, msg: m });
  };

  // dictation on the card itself (the device's speech recognition); sends when the person stops talking
  const falar = () => {
    if (ouvindo) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { abrirPinu({ voz: true, prefixo, pagina, assunto }); return; } // no recognition here: the panel listens
    const r = new SR();
    r.lang = lang === "en" ? "en-US" : "pt-BR"; r.interimResults = true; r.continuous = false;
    let ditado = "";
    r.onresult = (e) => { ditado = Array.from(e.results).map((x) => x[0].transcript).join(" "); setTexto(ditado); };
    r.onerror = () => setOuvindo(false);
    r.onend = () => { setOuvindo(false); rec.current = null; if (ditado.trim()) void perguntar(`${prefixo}${ditado}`); };
    rec.current = r; setOuvindo(true); r.start();
  };

  const cartoes = resposta?.msg.cartoes ?? [];
  const pendentes = cartoes.filter((c) => c.estado === "pendente").length;
  return (
    <div className="grid gap-2">
      {(pensando || resposta || erro) && (
        <section aria-live="polite" className="radar-crescer grid max-h-[42vh] gap-2 overflow-y-auto rounded-interno bg-s2 p-3 text-left">
          <p className="meta flex items-center gap-2 text-t2"><MiniAnelPinu tamanho={16} />Pinu{pensando && <span> · {t.pensando}</span>}</p>
          {pensando && <div className="grid gap-1.5" aria-hidden="true"><span className="h-3 w-4/5 rounded-pilula bg-s3" /><span className="h-3 w-3/5 rounded-pilula bg-s3" /></div>}
          {erro && <p className="corpo text-err">{erro}</p>}
          {resposta?.msg.content && (
            <>
              <input id={`pinu-mais-${resposta.mi}`} type="checkbox" className="peer sr-only" />
              <div className="corpo max-h-36 overflow-hidden text-t1 [mask-image:linear-gradient(#000_60%,transparent)] peer-checked:max-h-none peer-checked:[mask-image:none]"><Md>{resposta.msg.content}</Md></div>
              <label htmlFor={`pinu-mais-${resposta.mi}`} className="meta inline-flex w-fit cursor-pointer items-center gap-1 font-medium text-t2 peer-checked:hidden">{t.verTudo}<Icone nome="abrir" tamanho={16} /></label>
            </>
          )}
          {cartoes.length > 0 && (
            <ul className="grid gap-1.5">
              {cartoes.map((c, i) => (
                <li key={i} className="grid gap-0.5 rounded-interno bg-s3 px-3 py-2">
                  <span className="flex items-start gap-2">
                    <span className={`min-w-0 flex-1 font-texto text-sm font-medium ${c.estado === "cancelado" ? "text-t3 line-through" : "text-t1"}`}>{c.resumo}</span>
                    {c.estado === "feito" && <BadgeEstado estado="feita">{t.feito}</BadgeEstado>}
                    {c.estado === "cancelado" && <BadgeEstado estado="cancelada">{t.cancelada}</BadgeEstado>}
                    {c.estado === "erro" && <BadgeEstado estado="atrasada">{t.erro}</BadgeEstado>}
                  </span>
                  {c.detalhe && <span className="meta line-clamp-3 whitespace-pre-wrap text-t2">{c.detalhe}</span>}
                  {c.erro && <span className="meta text-err">{c.erro}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {pendentes > 0 && <Botao icone="confirmar" tamanho="M" carregando={decidindo} textoCarregando="…" onClick={() => decidir(true)}>{pendentes > 1 ? t.confirmarTodas.replace("{n}", String(pendentes)) : t.confirmar}</Botao>}
            {pendentes > 0 && <Botao variante="fantasma" icone="fechar" tamanho="M" desativado={decidindo} onClick={() => decidir(false)}>{t.cancelar}</Botao>}
            {resposta && <Chip tipo="pinu" onClick={() => abrirPinu({ pagina, assunto })}>{t.continuar}</Chip>}
          </div>
        </section>
      )}
      {linhaAcima ?? (sugestoes.length > 0 && !pensando && (
        <div className="flex items-center gap-2 overflow-x-auto">
          {sugestoes.map((x) => <span key={x.rotulo} className="shrink-0"><Chip tipo="pinu" onClick={() => void perguntar(x.texto)}>{x.rotulo}</Chip></span>)}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <form className="min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) void perguntar(`${prefixo}${texto}`); }}>
          <Campo tipo="busca" pinu name="pedido" rotulo={ouvindo ? t.ouvindo : t.diga} autoComplete="off" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={pensando}
            acaoDireita={<BotaoIcone icone={ouvindo ? "fechar" : "microfone"} aria-label={ouvindo ? t.parar : t.falar} tamanho={44} variante="acento" onClick={falar} />} />
        </form>
        {direita}
      </div>
    </div>
  );
}
