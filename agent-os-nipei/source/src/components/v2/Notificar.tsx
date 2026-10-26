"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Icone from "@/components/ds/Icone";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import Aviso from "@/components/ds/Aviso";
import { useToast } from "@/components/ds/Toast";
import { useConfirmar } from "@/components/ds/Dialogo";
import { notificarEnviarAction, notificarRascunhoAction } from "@/app/(v2)/actions";

type Tipo = "livre" | "resumo" | "alerta" | "cadastro" | "acesso";
type Labels = {
  notificar: string; tipos: Record<Tipo, string>; pedidoIA: string; gerar: string; montar: string; mensagem: string; previa: string;
  enviar: string; confirmar: string; cancelar: string; enviada: string; semWhats: string; naoVerificado: string; desligou: string; limites: string;
};

/**
 * Header button → panel: pick a kind, draft (ready-made or AI from a request), edit, preview with the
 * signature, confirm (dialog), send from the Nipëi WhatsApp. Nothing is sent without the explicit confirm.
 */
export default function Notificar({ pessoaId, nome, remetente, temWhats, verificado, desligou, labels }: {
  pessoaId: string; nome: string; remetente: string; temWhats: boolean; verificado: boolean; desligou: boolean; labels: Labels;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("livre");
  const [pedido, setPedido] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirmar = useConfirmar();
  const comIA = tipo === "livre" || tipo === "alerta";
  // <dialog> nativo: camada de cima (acima da barra do celular), Esc fecha, foco preso dentro
  const painel = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = painel.current; if (aberto && d && !d.open) d.showModal(); if (!aberto && d?.open) d.close(); }, [aberto]);

  const rascunho = () => start(async () => {
    setErro("");
    const r = await notificarRascunhoAction(pessoaId, tipo, pedido);
    if (r.error) return setErro(r.error);
    setTexto(r.texto ?? "");
  });
  const enviar = async () => {
    if (!(await confirmar({ titulo: `${labels.confirmar} ${nome}?`, confirmarRotulo: labels.enviar, cancelarRotulo: labels.cancelar }))) return;
    start(async () => {
      setErro("");
      const r = await notificarEnviarAction(pessoaId, tipo, texto);
      if (r.error) return setErro(r.error);
      toast.sucesso(labels.enviada);
      setTexto(""); setPedido(""); setAberto(false);
    });
  };
  const escolher = (x: Tipo) => { setTipo(x); setTexto(""); setErro(""); };

  return (
    <>
      <BotaoIcone icone="notificacao" tamanho={40} aria-label={labels.notificar} aria-expanded={aberto} onClick={() => setAberto((a) => !a)} />
      <dialog ref={painel} aria-label={`${labels.notificar} · ${nome}`} onClose={() => setAberto(false)} onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}
        className="mb-0 mt-auto max-h-[90vh] w-full max-w-none rounded-t-cartao bg-s1 p-0 text-t1 backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-cartao">
        {aberto && (
          <div className="grid gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="titulo-cartao inline-flex items-center gap-2 text-t1"><Icone nome="notificacao" tamanho={18} />{labels.notificar} · {nome}</p>
              <BotaoIcone icone="fechar" variante="fantasma" tamanho={44} aria-label={labels.cancelar} onClick={() => setAberto(false)} />
            </div>
            {!temWhats ? <p className="corpo text-t2">{labels.semWhats}</p> : (
              <>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                  {(Object.keys(labels.tipos) as Tipo[]).map((x) => <Chip key={x} ativo={tipo === x} onClick={() => escolher(x)}>{labels.tipos[x]}</Chip>)}
                </div>
                {comIA ? (
                  <div className="grid gap-2">
                    <Campo tipo="area" rotulo={labels.pedidoIA} value={pedido} onChange={(e) => setPedido(e.target.value)} rows={2} maxLength={600} />
                    <Botao variante="tonal" tamanho="M" icone="gerar-outra" className="justify-self-start" onClick={rascunho} desativado={!pedido.trim()} carregando={pending && !texto} textoCarregando={labels.gerar}>{labels.gerar}</Botao>
                  </div>
                ) : (
                  <Botao variante="tonal" tamanho="M" icone="gerar-outra" className="justify-self-start" onClick={rascunho} carregando={pending && !texto} textoCarregando={labels.montar}>{labels.montar}</Botao>
                )}
                <Campo tipo="area" rotulo={labels.mensagem} value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} maxLength={1500} />
                {texto.trim() && (
                  <div>
                    <p className="meta mb-1 text-t2">{labels.previa}</p>
                    <div className="whitespace-pre-wrap rounded-interno bg-ok-bg px-3 py-2 corpo text-t1">{texto.trim()}{`\n\n— ${remetente} · Nipëi`}</div>
                  </div>
                )}
                {!verificado && <Aviso estado="atencao" titulo={labels.naoVerificado} />}
                {desligou && <Aviso estado="atencao" titulo={labels.desligou} />}
                {erro && <Aviso estado="erro" titulo={erro} />}
                {texto.trim() && <Botao icone="enviar" tamanho="M" className="justify-self-start" onClick={enviar} carregando={pending} textoCarregando={labels.enviar}>{labels.enviar}</Botao>}
                <p className="meta text-t3">{labels.limites}</p>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
