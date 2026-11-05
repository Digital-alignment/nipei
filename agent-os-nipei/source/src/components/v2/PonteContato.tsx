import Link from "next/link";
import Avatar from "@/components/ds/Avatar";
import Botao from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import LinhaDoTempo from "@/components/ds/padroes/LinhaDoTempo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { conversaAction } from "@/app/(v2)/actions";
import { reconectarEm, type Pessoa } from "@/lib/v2/data";
import { fmtDate, type Dict, type Lang } from "@/lib/v2/i18n";

const foto = (p: Pessoa) => (p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined);

// Aba "Ponte" da ficha de um contato da equipe Pontes (DESIGN-SYSTEM.md 10.12): dados do contato + conversas.
export default function PonteContato({ p, pessoas, gerir, hoje, t, lang }: { p: Pessoa; pessoas: Pessoa[]; gerir: boolean; hoje: string; t: Dict; lang: Lang }) {
  const b = p.ponte, tp = t.ponte;
  const vinculo = pessoas.find((x) => x.id === b.vinculo);
  const quando = reconectarEm(p);
  const dia = (d: string) => (d === hoje ? t.hoje : fmtDate(d, lang));
  const Linha = ({ k, children }: { k: string; children?: React.ReactNode }) => children ? <div><dt className="rotulo-campo text-t3">{k}</dt><dd className="corpo text-t1">{children}</dd></div> : null;
  const vazio = !b.tipo && !b.empresa && !b.oferece.length && !b.comoConhecemos && !b.proximoPasso;
  return (
    <div className="grid gap-3 pt-3">
      <Cartao>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="rotulo-maiusculo text-t3">{tp.aba}</p>
          <span className="flex items-center gap-2">
            {quando && quando <= hoje && <BadgeEstado estado="aviso">{tp.reconectar}</BadgeEstado>}
            {gerir && <Botao href={`/pessoas/${p.id}/ponte`} variante="tonal" tamanho="P" icone="editar">{tp.editar}</Botao>}
          </span>
        </div>
        {vazio ? <p className="corpo text-t2">{tp.semDados}</p> : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Linha k={tp.tipo}>{b.tipo && (tp.tipos[b.tipo] ?? b.tipo)}</Linha>
            <Linha k={tp.empresa}>{b.empresa}</Linha>
            <Linha k={tp.oferece}>{b.oferece.length > 0 && <span className="mt-1 flex flex-wrap gap-1.5">{b.oferece.map((o) => <Chip key={o} tipo="metadado">{o}</Chip>)}</span>}</Linha>
            <Linha k={tp.comoConhecemos}>{b.comoConhecemos}</Linha>
            <Linha k={tp.proximoPasso}>{b.proximoPasso}</Linha>
          </dl>
        )}
        <dl className="grid gap-3 sm:grid-cols-2">
          <Linha k={tp.vinculo}>{vinculo
            ? <Link href={`/pessoas/${vinculo.id}`} className="mt-1 inline-flex items-center gap-2 hover:underline"><Avatar nome={vinculo.name} foto={foto(vinculo)} tamanho={24} />{vinculo.name}</Link>
            : <span className="text-t2">{tp.semVinculo}</span>}</Linha>
          <Linha k={tp.reconectarEm}>{quando ? `${dia(quando)} · ${b.reconectarDias} d` : `${b.reconectarDias} d`}</Linha>
        </dl>
        <p className="meta text-t3">{tp.naoEntra}</p>
      </Cartao>

      <Cartao>
        <p className="rotulo-maiusculo text-t3">{tp.conversas}</p>
        {gerir && (
          <form action={conversaAction} className="grid gap-2">
            <input type="hidden" name="pessoa" value={p.id} />
            <Campo tipo="area" name="texto" rotulo={tp.conversaPh} required maxLength={1000} />
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <Campo tipo="data" name="data" rotulo={tp.data} defaultValue={hoje} max={hoje} />
              <Campo name="proximo_passo" rotulo={tp.novoProximo} maxLength={300} />
            </div>
            <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{tp.registrar}</BotaoEnviar></div>
          </form>
        )}
        {b.conversas.length
          ? <LinhaDoTempo itens={b.conversas.map((c) => ({ dia: dia(c.data), tipo: "comentou" as const, quem: c.quem, texto: tp.conversou, comentario: c.texto }))} />
          : <p className="corpo text-t2">{tp.semConversas}</p>}
      </Cartao>
    </div>
  );
}
