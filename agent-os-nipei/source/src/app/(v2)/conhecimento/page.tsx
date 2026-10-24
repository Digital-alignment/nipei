import Link from "next/link";
import { Title } from "@/components/v2/ui";
import AutoRefresh from "@/components/v2/AutoRefresh";
import Recolhivel, { AtalhosSecao } from "@/components/v2/Recolhivel";
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
      <Title sub={t.conhecimentoIntro}>{t.conhecimento}</Title>

      <AtalhosSecao itens={secoes.filter((s) => s.atalho).map((s) => ({ id: s.id, label: s.atalho!(ctx), valor: s.contagem?.(ctx) ?? 0, alerta: s.alerta && (s.contagem?.(ctx) ?? 0) > 0 }))} />
      {fatos.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-neutral-500 mb-1"><span>{t.baseRevisada}</span><span className="tabular-nums">{revisados}/{fatos.length} · {pct}%</span></div>
          <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden"><div className="h-full bg-green-600" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {alertas > 0 && (
        <Link href="/conhecimento/alertas" className="block rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm mb-4">
          ⚠️ {alertas} · <span className="underline font-medium">{t.alertasEPropostas}</span>
        </Link>
      )}

      {secoes.map((s) => (
        <Recolhivel key={s.id} id={s.id} titulo={s.titulo(ctx)} contagem={s.contagem?.(ctx)} alerta={s.alerta} aberto={s.aberto(ctx)} forcar={s.forcar?.(ctx)}>
          <s.Componente ctx={ctx} />
        </Recolhivel>
      ))}
    </>
  );
}
