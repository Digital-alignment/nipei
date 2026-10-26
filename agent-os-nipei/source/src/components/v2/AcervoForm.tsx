"use client";

import { useState } from "react";
import BotaoEnviar from "./BotaoEnviar";
import Campo from "@/components/ds/Campo";
import { tipoLink } from "@/lib/v2/acervoLinks";

export type AcervoFormLabels = {
  link: string; titulo: string; tipo: string; projeto: string; ano: string; descricao: string; nenhum: string; salvar: string; enviando: string; detectado: string;
};

/**
 * Add or edit an Acervo item. The link comes first: while typing, the kind of link is shown
 * ("Pasta do Drive", "Planilha Google", "YouTube"…) and the type is suggested until the person picks one.
 */
export default function AcervoForm({ action, tipos, projetos, labels, inicial, id }: {
  action: (f: FormData) => void | Promise<void>; tipos: { id: string; nome: string }[]; projetos: { id: string; nome: string }[];
  labels: AcervoFormLabels; id?: string;
  inicial?: { titulo: string; url: string; tipo: string; projeto: string; ano: string; descricao: string };
}) {
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? "");
  const [escolheu, setEscolheu] = useState(!!inicial);
  const det = tipoLink(url);
  const mudarUrl = (v: string) => {
    setUrl(v);
    const s = tipoLink(v)?.sugere;
    if (!escolheu && s) setTipo(s);
  };
  return (
    <form action={action} className="grid gap-3">
      {id && <input type="hidden" name="id" value={id} />}
      <Campo name="url" rotulo={labels.link} inputMode="url" required pattern="https://.*" value={url} onChange={(e) => mudarUrl(e.target.value)} placeholder="https://drive.google.com/…"
        ajuda={det && url.startsWith("https://") ? `${labels.detectado}: ${det.rotulo}` : undefined} />
      <Campo name="titulo" rotulo={labels.titulo} required maxLength={150} defaultValue={inicial?.titulo} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Campo tipo="selecao" name="tipo" rotulo={labels.tipo} value={tipo || "outros"} onChange={(e) => { setTipo(e.target.value); setEscolheu(true); }}>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Campo>
        <Campo name="ano" rotulo={labels.ano} inputMode="numeric" pattern="\d{4}" maxLength={4} defaultValue={inicial ? inicial.ano : String(new Date().getFullYear())} />
        <div className="col-span-2 md:col-span-1">
          <Campo tipo="selecao" name="projeto" rotulo={labels.projeto} defaultValue={inicial?.projeto ?? ""}><option value="">{labels.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
        </div>
      </div>
      <Campo name="descricao" rotulo={labels.descricao} maxLength={300} defaultValue={inicial?.descricao} />
      <div><BotaoEnviar enviando={labels.enviando} icone="confirmar" variante="primario">{labels.salvar}</BotaoEnviar></div>
    </form>
  );
}

/** A GET form that applies itself when a select changes (filters without a "Filtrar" button). */
export function FiltroAuto({ children, className }: { children: React.ReactNode; className?: string }) {
  return <form className={className} onChange={(e) => { if ((e.target as HTMLElement).tagName === "SELECT") e.currentTarget.requestSubmit(); }}>{children}</form>;
}
