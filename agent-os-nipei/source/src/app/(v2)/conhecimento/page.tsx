import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { BarraProgresso } from "@/components/ds/Progresso";
import Aviso from "@/components/ds/Aviso";
import Botao from "@/components/ds/Botao";
import AutoRefresh from "@/components/v2/AutoRefresh";
import Recolhivel, { AtalhosSecao } from "@/components/ds/SecaoRecolhivel";
import { currentUser, getEquipes, getPessoas } from "@/lib/v2/data";
import { getFatos, getFontes, podeRevisar } from "@/lib/v2/conhecimento";
import { auditoriaSemanal, getAlertas } from "@/lib/v2/auditor";
import { getPropostas, podeDecidir } from "@/lib/v2/propostas";
import { getT } from "@/lib/v2/i18n";
import { SECOES, type Ctx } from "./secoes";

// Conhecimento: shortcuts + review progress on top, then the sections in ./secoes (each collapsible,
// remembered per device). Data is loaded once here and handed to every section in `ctx`.
export default async function Conhecimento({ searchParams }: { searchParams: Promise<{ q?: string; equipe?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const fontes = getFontes(), fatos = getFatos(), pessoas = getPessoas();
  const porFonte = (fid: string) => {
    const meus = fatos.filter((f) => f.fonte === fid);
    return { pendentes: meus.filter((f) => f.status === "proposto"), revisados: meus.filter((f) => f.status !== "proposto").length, total: meus.length };
  };
  const ctx: Ctx = {
    me, t, lang, q, fontes, fatos, equipes: getEquipes(), porFonte,
    nome: (id) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id,
    paraMim: fontes.filter((f) => porFonte(f.id).pendentes.some((x) => podeRevisar(me, x))),
    confirmados: fatos.filter((f) => f.status === "confirmado"),
  };
  void auditoriaSemanal(); // at most once a week, in the background
  const alertas = getAlertas().filter((a) => {
    const f = fatos.find((x) => x.id === a.fato);
    return a.status === "aberta" && (f ? podeRevisar(me, f) : me.gestao);
  }).length + getPropostas().filter((p) => p.status === "aberta" && podeDecidir(me, p)).length;
  const revisados = fatos.filter((f) => f.status !== "proposto").length;
  const pct = fatos.length ? Math.round((revisados / fatos.length) * 100) : 0;
  const secoes = SECOES.filter((s) => !s.mostrar || s.mostrar(ctx));

  return (
    <>
      <AutoRefresh ativo={fontes.some((f) => f.status === "processando")} />
      <CabecalhoPagina selo="espiral" rotulo={`${fatos.length} ${t.fatos.toLowerCase()} · ${fontes.length} ${t.fontesMin}`} titulo={t.conhecimento} subtitulo={t.conhecimentoIntro} />

      <AtalhosSecao itens={secoes.filter((s) => s.atalho).map((s) => ({ id: s.id, label: s.atalho!(ctx), valor: s.contagem?.(ctx) ?? 0, alerta: s.alerta && (s.contagem?.(ctx) ?? 0) > 0 }))} />
      {fatos.length > 0 && (
        <div className="mb-5 grid gap-1.5">
          <span className="rotulo-maiusculo text-t3">{t.baseRevisada}</span>
          <BarraProgresso valor={revisados} max={fatos.length} planejado rotulo={`${revisados}/${fatos.length} · ${pct}%`} rotuloAcessivel={t.baseRevisada} />
        </div>
      )}
      {alertas > 0 && <Aviso estado="atencao" className="mb-4" titulo={`${alertas} · ${t.alertasEPropostas}`} acoes={<Botao href="/conhecimento/alertas" icone="atencao" variante="tonal" tamanho="M" iconeDireita="avancar">{t.abrir}</Botao>} />}

      {secoes.map((s) => (
        <Recolhivel key={s.id} id={s.id} titulo={s.titulo(ctx)} contagem={s.contagem?.(ctx)} alerta={s.alerta} aberto={s.aberto(ctx)} forcar={s.forcar?.(ctx)}>
          <s.Componente ctx={ctx} />
        </Recolhivel>
      ))}
    </>
  );
}
