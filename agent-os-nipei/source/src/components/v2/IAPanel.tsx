"use client";

import { useState, useTransition } from "react";
import type { ModoIA, PropostaIA } from "@/lib/v2/ia";
import Botao from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import { MiniAnelPinu, OrbePinu } from "@/components/ds/Pinu";
import { Skeleton } from "@/components/ds/Estados";

type Labels = Record<
  "titulo" | "detalhar" | "proximo" | "atualizar" | "pensando" | "aplicar" | "descartar" | "novaDescricao" | "adicionarChecklist" |
  "concluirChecklist" | "proximoPasso" | "mudarStatus" | "mudarPrazo" | "fontes" | "nada" | "aviso" | "proposta" | "ajustar",
  string
> & { status: Record<string, string> };

const caixa = "mt-0.5 size-[18px] shrink-0 accent-ac";

/**
 * Asks the AI for a suggestion (server action, nothing is written) and shows it as the Pinu proposal card
 * (DESIGN-SYSTEM.md 10.11): every change has its own checkbox; Confirmar writes through aplicarIAAction,
 * Ajustar opens the texts for editing, Cancelar drops it.
 */
export default function IAPanel({ id, propor, aplicar, labels }: {
  id: string;
  propor: (id: string, modo: ModoIA) => Promise<{ proposta?: PropostaIA; error?: string }>;
  aplicar: (f: FormData) => Promise<void>;
  labels: Labels;
}) {
  const [p, setP] = useState<PropostaIA | null>(null);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<ModoIA | null>(null);
  const [ajustando, setAjustando] = useState(false);
  const [pending, start] = useTransition();
  const [aplicando, startAplicar] = useTransition();

  const pedir = (m: ModoIA) => {
    setErro(""); setP(null); setModo(m); setAjustando(false);
    start(async () => {
      const r = await propor(id, m).catch(() => ({ error: "Falha ao falar com a IA" }) as { error: string; proposta?: undefined });
      if (r.error) setErro(r.error); else setP(r.proposta ?? null);
    });
  };
  const fechar = () => { setP(null); setModo(null); setAjustando(false); };
  const nomeModo = { detalhar: labels.detalhar, proximo: labels.proximo, atualizar: labels.atualizar } as Record<ModoIA, string>;

  const vazio = p && !p.descricao && !p.checklistAdicionar.length && !p.checklistConcluir.length && !p.proximoPasso && !p.status && !p.prazo;

  return (
    <section className="grid gap-3">
      <h2 className="titulo-cartao flex items-center gap-2"><MiniAnelPinu tamanho={22} />{labels.titulo}</h2>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {(["detalhar", "proximo", "atualizar"] as ModoIA[]).map((m) => (
          <Chip key={m} tipo="pinu" onClick={pending ? undefined : () => pedir(m)} className={modo === m && (pending || p) ? "shadow-[inset_0_0_0_1.5px_var(--ac)]" : ""}>{nomeModo[m]}</Chip>
        ))}
      </div>

      {pending && (
        // pensando: mini-orbe + frase + skeleton de 2 linhas
        <div className="grid gap-2.5 rounded-cartao bg-s1 p-4" aria-live="polite">
          <span className="flex items-center gap-2.5 text-t2"><OrbePinu estado="pensando" tamanho={28} /><span className="corpo">{labels.pensando}</span></span>
          <Skeleton largura="85%" /><Skeleton largura="60%" />
        </div>
      )}
      {erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{erro}</p>}

      {p && !pending && (
        <Cartao variante="pinu">
          <form action={(fd) => startAplicar(async () => { await aplicar(fd); fechar(); })} className="grid gap-3 font-texto text-sm text-t1">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="modo" value={p.modo} />
            <input type="hidden" name="modelo" value={p.modelo} />
            <div className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-pilula bg-ac-soft text-ac-text"><Icone nome="gerar-outra" tamanho={18} /></span>
              <span className="titulo-cartao min-w-0 flex-1">{nomeModo[p.modo]}</span>
              <span className="rounded-pilula bg-ac-soft px-2.5 py-0.5 text-xs font-semibold text-ac-text">{labels.proposta}</span>
            </div>
            {p.resumo && <p className="corpo whitespace-pre-line text-t2">{p.resumo}</p>}
            {vazio && <p className="meta text-t2">{labels.nada}</p>}

            {p.descricao && (
              <div className="grid gap-1.5">
                <label className="inline-flex items-start gap-2 font-semibold"><input type="checkbox" name="usarDescricao" defaultChecked className={caixa} />{labels.novaDescricao}</label>
                {ajustando
                  ? <Campo tipo="area" name="descricao" rotulo={labels.novaDescricao} defaultValue={p.descricao} rows={8} className="bg-s1!" />
                  : <><input type="hidden" name="descricao" value={p.descricao} /><p className="corpo line-clamp-6 whitespace-pre-line pl-[26px] text-t2">{p.descricao}</p></>}
              </div>
            )}
            {p.checklistAdicionar.length > 0 && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 font-semibold">{labels.adicionarChecklist}</legend>
                {p.checklistAdicionar.map((x) => <label key={x} className="inline-flex items-start gap-2"><input type="checkbox" name="adicionar" value={x} defaultChecked className={caixa} />{x}</label>)}
              </fieldset>
            )}
            {p.checklistConcluir.length > 0 && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 font-semibold">{labels.concluirChecklist}</legend>
                {p.checklistConcluir.map((x) => <label key={x} className="inline-flex items-start gap-2"><input type="checkbox" name="concluir" value={x} defaultChecked className={caixa} />{x}</label>)}
              </fieldset>
            )}
            {p.proximoPasso && (
              <div className="grid gap-1.5">
                <label className="inline-flex items-start gap-2 font-semibold"><input type="checkbox" name="usarProximo" defaultChecked className={caixa} />{labels.proximoPasso}</label>
                {ajustando
                  ? <Campo tipo="area" name="proximo" rotulo={labels.proximoPasso} defaultValue={p.proximoPasso} rows={3} className="bg-s1!" />
                  : <><input type="hidden" name="proximo" value={p.proximoPasso} /><p className="corpo whitespace-pre-line pl-[26px] text-t2">{p.proximoPasso}</p></>}
              </div>
            )}
            {p.status && (
              <label className="inline-flex items-start gap-2"><input type="checkbox" name="usarStatus" defaultChecked className={caixa} /><input type="hidden" name="status" value={p.status} />{labels.mudarStatus}: <b>{labels.status[p.status]}</b></label>
            )}
            {p.prazo && (
              <label className="inline-flex items-start gap-2"><input type="checkbox" name="usarPrazo" defaultChecked className={caixa} /><input type="hidden" name="prazo" value={p.prazo} />{labels.mudarPrazo}: <b>{p.prazo}</b></label>
            )}
            {p.fontes.length > 0 && <p className="meta text-t3">{labels.fontes}: {p.fontes.join(" · ")}</p>}
            <p className="meta text-t3">{labels.aviso} · {p.modelo}</p>
            <div className="flex flex-wrap gap-2">
              {!vazio && <Botao type="submit" icone="confirmar" tamanho="M" carregando={aplicando}>{labels.aplicar}</Botao>}
              {!vazio && !ajustando && (p.descricao || p.proximoPasso) && <Botao type="button" variante="tonal" icone="editar" tamanho="M" onClick={() => setAjustando(true)}>{labels.ajustar}</Botao>}
              <Botao type="button" variante="fantasma" icone="fechar" tamanho="M" onClick={fechar}>{labels.descartar}</Botao>
            </div>
          </form>
        </Cartao>
      )}
    </section>
  );
}
