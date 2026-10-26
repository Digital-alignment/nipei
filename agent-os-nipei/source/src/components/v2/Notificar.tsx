"use client";

import { useState, useTransition } from "react";
import Icone from "@/components/ds/Icone";
import { notificarEnviarAction, notificarRascunhoAction } from "@/app/(v2)/actions";

type Tipo = "livre" | "resumo" | "alerta" | "cadastro" | "acesso";
type Labels = {
  notificar: string; tipos: Record<Tipo, string>; pedidoIA: string; gerar: string; montar: string; mensagem: string; previa: string;
  enviar: string; confirmar: string; cancelar: string; enviada: string; semWhats: string; naoVerificado: string; desligou: string; limites: string;
};

/**
 * Header button → panel: pick a kind, draft (ready-made or AI from a request), edit, preview with the
 * signature, confirm, send from the Nipëi WhatsApp. Nothing is sent without the explicit confirm tap.
 */
export default function Notificar({ pessoaId, nome, remetente, temWhats, verificado, desligou, labels }: {
  pessoaId: string; nome: string; remetente: string; temWhats: boolean; verificado: boolean; desligou: boolean; labels: Labels;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("livre");
  const [pedido, setPedido] = useState("");
  const [texto, setTexto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const comIA = tipo === "livre" || tipo === "alerta";

  const rascunho = () => start(async () => {
    setErro(""); setOk(false);
    const r = await notificarRascunhoAction(pessoaId, tipo, pedido);
    if (r.error) return setErro(r.error);
    setTexto(r.texto ?? "");
  });
  const enviar = () => start(async () => {
    setErro("");
    const r = await notificarEnviarAction(pessoaId, tipo, texto);
    setConfirmando(false);
    if (r.error) return setErro(r.error);
    setOk(true); setTexto(""); setPedido("");
  });
  const escolher = (x: Tipo) => { setTipo(x); setTexto(""); setErro(""); setOk(false); setConfirmando(false); };

  const btn = "rounded-interno bg-s2 px-3 py-1.5 text-sm disabled:opacity-50";
  return (
    <>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-label={labels.notificar} title={labels.notificar} aria-expanded={aberto}
        className={`w-9 h-9 rounded-pilula flex items-center justify-center ${aberto ? "bg-s3 text-t1 shadow-[0_0_0_1.5px_var(--ac)]" : "bg-s3 text-t1 hover:bg-s4"}`}>
        <Icone nome="notificacao"  tamanho={16} />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
        <div role="dialog" aria-modal="true" className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-s2 p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium inline-flex items-center gap-1.5"><Icone nome="notificacao"  tamanho={14} />{labels.notificar} · {nome}</p>
            <button type="button" onClick={() => setAberto(false)} aria-label={labels.cancelar} className="text-t3"><Icone nome="fechar"  tamanho={16} /></button>
          </div>
          {!temWhats ? <p className="text-sm text-t2">{labels.semWhats}</p> : (
            <>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
                {(Object.keys(labels.tipos) as Tipo[]).map((x) => (
                  <button key={x} type="button" onClick={() => escolher(x)}
                    className={`shrink-0 rounded-pilula px-2.5 py-1 text-xs ${tipo === x ? "bg-ac text-ac-ink" : "bg-s2"}`}>{labels.tipos[x]}</button>
                ))}
              </div>
              {comIA ? (
                <div className="grid gap-2">
                  <textarea value={pedido} onChange={(e) => setPedido(e.target.value)} rows={2} maxLength={600} placeholder={labels.pedidoIA}
                    className="w-full rounded-interno bg-s2 bg-s2 px-3 py-2 text-sm" />
                  <button type="button" onClick={rascunho} disabled={pending || !pedido.trim()} className={`${btn} justify-self-start inline-flex items-center gap-1.5`}><Icone nome="gerar-outra"  tamanho={14} />{labels.gerar}</button>
                </div>
              ) : (
                <button type="button" onClick={rascunho} disabled={pending} className={`${btn} justify-self-start`}>{labels.montar}</button>
              )}
              <label className="grid gap-1 text-xs text-t2">{labels.mensagem}
                <textarea value={texto} onChange={(e) => { setTexto(e.target.value); setConfirmando(false); }} rows={6} maxLength={1500}
                  className="w-full rounded-interno bg-s2 bg-s2 px-3 py-2 text-sm text-t1" />
              </label>
              {texto.trim() && (
                <div>
                  <p className="text-xs text-t2 mb-1">{labels.previa}</p>
                  <div className="rounded-interno bg-ok-bg border px-3 py-2 text-sm whitespace-pre-wrap">{texto.trim()}{`\n\n— ${remetente} · Nipëi`}</div>
                </div>
              )}
              {!verificado && <p className="text-xs text-warn">⚠ {labels.naoVerificado}</p>}
              {desligou && <p className="text-xs text-warn">⚠ {labels.desligou}</p>}
              {erro && <p className="text-sm text-err">{erro}</p>}
              {ok && <p className="text-sm text-ok">✓ {labels.enviada}</p>}
              {texto.trim() && (confirmando ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{labels.confirmar} {nome}?</span>
                  <button type="button" onClick={enviar} disabled={pending} className="inline-flex items-center gap-1.5 rounded-interno bg-ac text-ac-ink px-3 py-1.5 text-sm font-medium disabled:opacity-50"><Icone nome="enviar"  tamanho={14} />{labels.enviar}</button>
                  <button type="button" onClick={() => setConfirmando(false)} className={btn}>{labels.cancelar}</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmando(true)} disabled={pending} className="justify-self-start inline-flex items-center gap-1.5 anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]"><Icone nome="enviar"  tamanho={14} />{labels.enviar}</button>
              ))}
              <p className="text-xs text-t3">{labels.limites}</p>
            </>
          )}
        </div>
        </div>
      )}
    </>
  );
}
