import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import ChipDS from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import Selo from "@/components/ds/Selo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import Icone from "@/components/ds/Icone";
import { Avatar, Chip } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getPessoas, type Pessoa } from "@/lib/v2/data";
import { resumoPessoas } from "@/lib/v2/pessoasInfo";
import { NIVEL_COR } from "@/lib/v2/participacao";
import { getT } from "@/lib/v2/i18n";
import CadastroLote from "@/components/v2/CadastroLote";
import { LoteToggle } from "@/components/v2/LoteBarra";
import { createPessoaAction } from "../actions";
import EscolherEquipes from "@/components/v2/EscolherEquipes";

const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

// What a profile needs to be useful: a WhatsApp, a role, confirmed details, a photo.
const completude = (p: Pessoa) => [!!p.whatsapp, !!(p.funcao || p.area), !!p.dadosConfirmadosEm, !!p.foto].filter(Boolean).length;
const SITUACOES = ["incompleto", "sem_whats", "nao_verificado", "sem_acesso"] as const;

export default async function Pessoas({ searchParams }: { searchParams: Promise<{ q?: string; equipe?: string; ordem?: string; situacao?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes();
  const gerenciaveis = equipes.filter((e) => can.gerirEquipe(me, e.id));
  const info = resumoPessoas(me.gestao); // Participação only for gestão
  const busca = (q.q ?? "").toLowerCase().trim();
  const todas = getPessoas().filter((p) => !busca || `${p.name} ${p.apelido} ${p.funcao} ${p.nipeiId}`.toLowerCase().includes(busca));
  const ordem = me.gestao && ["carga", "atrasadas", "participacao"].includes(q.ordem ?? "") ? q.ordem! : "nome";
  const ordenar = (ps: Pessoa[]) => [...ps].sort((a, b) => {
    const A = info.get(a.id)!, B = info.get(b.id)!;
    if (ordem === "carga") return B.abertas - A.abertas;
    if (ordem === "atrasadas") return B.atrasadas - A.atrasadas;
    if (ordem === "participacao") return (B.participacao?.total ?? -1) - (A.participacao?.total ?? -1);
    return a.name.localeCompare(b.name, "pt");
  });
  const temAcesso = (p: Pessoa) => p.equipes.some((id) => equipes.find((e) => e.id === id)?.acesso);
  const naSituacao: Record<(typeof SITUACOES)[number], (p: Pessoa) => boolean> = {
    incompleto: (p) => completude(p) < 4, sem_whats: (p) => !p.whatsapp,
    nao_verificado: (p) => !!p.whatsapp && !p.whatsappVerificado, sem_acesso: (p) => !temAcesso(p),
  };
  const situacao = me.gestao && (SITUACOES as readonly string[]).includes(q.situacao ?? "") ? q.situacao as (typeof SITUACOES)[number] : null;
  const daEquipe = todas.filter((p) => p.equipes.length > 0 && (!q.equipe || p.equipes.includes(q.equipe)));
  const ativas = ordenar(daEquipe.filter((p) => !situacao || naSituacao[situacao](p)));
  const inativas = todas.filter((p) => p.equipes.length === 0 && !p.externo);
  const link = (o: Record<string, string | undefined>) => "/pessoas?" + new URLSearchParams(Object.entries({ q: q.q, equipe: q.equipe, ordem: q.ordem, situacao: q.situacao, ...o }).filter(([, v]) => v) as [string, string][]);

  const Cartao = ({ p }: { p: Pessoa }) => {
    const n = info.get(p.id)!;
    const acesso = temAcesso(p);
    const part = acesso ? n.participacao : undefined; // no platform access → a score would only measure absence
    const c = completude(p);
    const papel = p.funcao && p.funcao !== "Outro" ? p.funcao : p.area || p.funcao;
    const fone = !p.whatsapp ? { cor: "text-t3", t: t.semWhats } : p.whatsappVerificado ? { cor: "text-ok", t: t.whatsVerificado } : { cor: "text-warn", t: t.whatsNaoVerificado };
    return (
      <li className="relative rounded-cartao bg-s1 p-4 transition-colors hover:bg-s2">
        {me.gestao && <input type="checkbox" name="ids" value={p.id} form="lote-pessoas" aria-label={p.name} className="lote-caixa absolute top-3 right-3 z-10 w-4 h-4 accent-ac" />}
        <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
          <Avatar name={p.name} size={40} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} />
          <div className="min-w-0 flex-1">
            <p className="titulo-cartao truncate">{p.name}</p>
            <p className={`text-xs truncate ${papel ? "text-t2" : "text-t3 italic"}`}>{papel || t.funcaoNaoDefinida}</p>
          </div>
        </Link>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <span className="flex gap-1">{p.equipes.map((id) => { const k = chaveEquipe(id); const e = equipes.find((x) => x.id === id); return e && (k ? <Selo key={id} nome={EQUIPES_DS[k].selo} tamanho={16} aria-label={e.nome} style={{ color: EQUIPES_DS[k].cor }} /> : <span key={id} title={e.nome} className="size-2 rounded-pilula bg-s4" />); })}</span>
          <span className="text-t2 tabular-nums">{n.abertas} {n.abertas === 1 ? t.abertaLbl : t.abertasLbl}</span>
          {n.atrasadas > 0 && <span className="text-err tabular-nums">{n.atrasadas} {n.atrasadas === 1 ? t.atrasadaLbl : t.atrasadasLbl}</span>}
          <span className="ml-auto flex items-center gap-2">
            {me.gestao && <span title={t.perfilCompleto} className={`tabular-nums ${c === 4 ? "text-ok" : c >= 2 ? "text-warn" : "text-t3"}`}>{c}/4</span>}
            <span title={fone.t} className={fone.cor}><Icone nome="mensagem"  tamanho={13} /></span>
            {p.suspenso ? <span title={t.acessoSuspensoTexto} className="inline-flex items-center gap-1 rounded-pilula bg-warn-bg px-2 py-0.5 text-xs text-warn"><Icone nome="cadeado" tamanho={12} />{t.suspensoCurto}</span>
              : me.gestao && (part ? <span title={t.participacao} className={`tabular-nums font-medium ${NIVEL_COR[part.nivel]}`}>{part.total ?? "—"}</span>
              : !acesso && <span title={t.semAcessoAjuda} className="rounded-pilula bg-s2 px-2 py-0.5 text-xs text-t2">{t.semAcessoLbl}</span>)}
            {p.whatsapp && <a href={waLink(p.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="relative z-10 text-t3 hover:text-ok"><Icone nome="mensagem"  tamanho={16} /></a>}
          </span>
        </div>
      </li>
    );
  };

  return (
    <>
      {(() => { const e = q.equipe ? equipes.find((x) => x.id === q.equipe) : null; return (
        <div className="-ml-3 mb-2"><Botao href={e ? `/equipes/${e.id}` : "/equipes"} variante="fantasma" tamanho="P" icone="voltar">{e ? e.nome : t.equipes}</Botao></div>
      ); })()}
      <CabecalhoPagina selo="mao" rotulo={`${ativas.length} ${t.membros.toLowerCase()}`} titulo={t.pessoas}
        acoes={me.gestao && <Botao href="/pessoas/organizar" variante="tonal" icone="pessoas" tamanho="M">{t.organizarEquipes}</Botao>}
        filtros={<>
          <Chip href={link({ equipe: undefined })} on={!q.equipe}>{t.todas}</Chip>
          {[...equipes].sort((a, b) => Number(b.id === q.equipe) - Number(a.id === q.equipe)).map((e) => <Chip key={e.id} href={link({ equipe: e.id })} cor={e.cor} on={q.equipe === e.id}>{e.nome}</Chip>)}
        </>} />
      <form className="mb-3">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        {q.ordem && <input type="hidden" name="ordem" value={q.ordem} />}
        <Campo tipo="busca" name="q" rotulo={t.buscar} defaultValue={q.q} />
      </form>
      {me.gestao && (
        <div className="-mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <span className="rotulo-maiusculo shrink-0 text-t3">{t.ordenar}</span>
          {(["nome", "carga", "atrasadas", "participacao"] as const).map((o) => (
            <ChipDS key={o} href={link({ ordem: o === "nome" ? undefined : o })} ativo={ordem === o} icone={o === "nome" ? "pessoa" : o === "carga" ? "tarefa" : o === "atrasadas" ? "atencao" : "informacao"}>
              {o === "nome" ? t.nome : o === "carga" ? t.maisCarga : o === "atrasadas" ? t.atrasadas : t.participacao}
            </ChipDS>
          ))}
        </div>
      )}

      {me.gestao && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            <Chip href={link({ situacao: undefined })} on={!situacao}>{t.todasSituacoes}</Chip>
            {SITUACOES.map((x) => { const qtd = daEquipe.filter(naSituacao[x]).length; return qtd > 0 && <Chip key={x} href={link({ situacao: situacao === x ? undefined : x })} on={situacao === x}>{t.situacoes[x]} ({qtd})</Chip>; })}
          </div>
          <LoteToggle formId="lote-pessoas" label={t.selecionarLbl} cancelar={t.cancelar} />
        </div>
      )}
      <h2 className="mb-3 flex items-center gap-2"><span className="titulo-secao">{t.membros}</span><span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{ativas.length}</span></h2>
      <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ativas.map((p) => <Cartao key={p.id} p={p} />)}</ul>
      {me.gestao && <CadastroLote formId="lote-pessoas" labels={{ selecionadas: t.selecionadas, todas: t.selecionarTodas, limpar: t.limparSelecao, enviar: t.enviarCadastroLote, resultado: t.resultadoCadastroLote, aviso: t.avisoCadastroLote }} />}

      {gerenciaveis.length > 0 && (
        <details className="mb-4 rounded-cartao bg-s1">
          <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="mais" tamanho={18} />{t.novaPessoa}</summary>
          <form action={createPessoaAction} className="grid gap-2 px-4 pb-4 sm:grid-cols-[1fr_14rem_auto] sm:items-center">
            <Campo name="name" rotulo={t.nome} required maxLength={120} className="bg-s2" />
            <Campo tipo="selecao" name="equipe" rotulo={t.equipe}>
              {me.gestao && <option value="">{t.semEquipe}</option>}
              {gerenciaveis.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Campo>
            <BotaoEnviar enviando="…" icone="mais" variante="primario">{t.adicionar}</BotaoEnviar>
          </form>
        </details>
      )}

      {inativas.length > 0 && (
        <details className="rounded-cartao bg-s1">
          <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold">{t.inativos}<span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs tabular-nums text-t2">{inativas.length}</span><Icone nome="abrir" tamanho={18} className="ml-auto text-t3" /></summary>
          <ul className="px-4 pb-2">
            {inativas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 border-t border-s2">
                <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 flex-1 min-w-32"><Avatar name={p.name} size={28} /><span className="text-sm">{p.name}</span></Link>
                {gerenciaveis.length > 0 && (
                  <EscolherEquipes pessoaId={p.id} equipes={gerenciaveis.filter((e) => !e.gestao || me.gestao)} t={t} comNota={me.gestao} />
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {me.gestao && <p className="meta mt-8 text-t2"><Link href="/legacy" className="underline">{t.versaoAnterior}</Link></p>}
    </>
  );
}
