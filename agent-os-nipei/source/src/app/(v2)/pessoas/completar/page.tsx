import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/ds/Avatar";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Chip from "@/components/ds/Chip";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import { EstadoVazio } from "@/components/ds/Estados";
import { ToastAoAbrir } from "@/components/ds/Toast";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { salvarFichasAction, sugerirFichasAction } from "../../actions";
import { currentUser, getEquipes, getPessoas, vault, type Pessoa } from "@/lib/v2/data";
import { getSugestoesPessoas } from "@/lib/v2/pessoasFicha";
import { getT } from "@/lib/v2/i18n";

const FILTROS = ["sem-papel", "sem-equipe", "sem-whats", "sem-referente"] as const;

// "Completar fichas" (DS 10.23, gestão): role, team, WhatsApp, e-mail and "referente de" for many people at once.
export default async function CompletarFichas({ searchParams }: { searchParams: Promise<{ f?: string; ok?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const tp = t.ps;
  const equipes = getEquipes().filter((e) => !e.contatos);
  const todas = getPessoas().filter((p) => !p.contato && !p.externo);
  const teste: Record<(typeof FILTROS)[number], (p: Pessoa) => boolean> = {
    "sem-papel": (p) => !p.funcao, "sem-equipe": (p) => !p.equipes.length, "sem-whats": (p) => !p.whatsapp, "sem-referente": (p) => !p.referenteDe.length,
  };
  const rot: Record<(typeof FILTROS)[number], string> = { "sem-papel": tp.semPapel, "sem-equipe": tp.semEquipe, "sem-whats": tp.semWhats, "sem-referente": tp.semReferente };
  const filtro = (FILTROS as readonly string[]).includes(q.f ?? "") ? q.f as (typeof FILTROS)[number] : null;
  const lista = todas.filter((p) => !filtro || teste[filtro](p))
    .sort((a, b) => Number(!!b.equipes.length) - Number(!!a.equipes.length) || a.name.localeCompare(b.name, "pt"));
  const sug = getSugestoesPessoas(vault());
  const nomeEq = (id: string) => equipes.find((e) => e.id === id)?.nome ?? id;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="-ml-3 mb-2"><Botao href="/pessoas" variante="fantasma" tamanho="P" icone="voltar">{t.pessoas}</Botao></div>
      <CabecalhoPagina selo="mao" rotulo={t.pessoas} titulo={tp.completar} subtitulo={tp.completarAjuda}
        filtros={<>
          <Chip ativo={!filtro} href="/pessoas/completar" contagem={todas.length}>{tp.todas}</Chip>
          {FILTROS.map((f) => <Chip key={f} ativo={filtro === f} href={`/pessoas/completar?f=${f}`} contagem={todas.filter(teste[f]).length}>{rot[f]}</Chip>)}
        </>} />
      <Cartao variante="pinu" className="mb-4">
        <p className="corpo text-t1">{tp.sugerirAjuda}</p>
        <form action={sugerirFichasAction}><BotaoEnviar enviando="…" icone="gerar-outra" variante="tonal">{tp.sugerir}</BotaoEnviar></form>
      </Cartao>
      {lista.length === 0 ? <EstadoVazio selo="mao" titulo={tp.nenhuma} /> : (
        <form action={salvarFichasAction} className="grid gap-2">
          {lista.map((p) => {
            const s = sug[p.id] ?? {};
            const papel = p.funcao || s.papel || "", ref = p.referenteDe.length ? p.referenteDe.join(", ") : (s.referente ?? []).join(", ");
            const sugerido = (!p.funcao && !!s.papel) || (!p.referenteDe.length && !!s.referente?.length) || (!p.equipes.length && !!s.equipe);
            return (
              <div key={p.id} className="grid gap-2 rounded-cartao bg-s1 p-3 lg:grid-cols-[13rem_1fr_1fr] lg:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar nome={p.name} tamanho={24} />
                  <div className="min-w-0">
                    <Link href={`/pessoas/${p.id}`} className="corpo block truncate font-medium text-t1 hover:underline">{p.name}</Link>
                    <p className="meta truncate text-t3">{p.equipes.map(nomeEq).join(", ") || tp.semEquipe}</p>
                  </div>
                  {sugerido && <Chip tipo="pinu">{tp.sugerido}</Chip>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name={`papel_${p.id}`} defaultValue={papel} placeholder={tp.papelPh} aria-label={`${tp.papel}: ${p.name}`} maxLength={80} className={CAMPO_COMPACTO} />
                  <input name={`ref_${p.id}`} defaultValue={ref} placeholder={tp.referente} aria-label={`${tp.referente}: ${p.name}`} className={CAMPO_COMPACTO} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {p.equipes.length ? <span className="meta self-center text-t3">{p.equipes.length} {p.equipes.length === 1 ? t.equipe.toLowerCase() : t.equipes.toLowerCase()}</span> : (
                    <select name={`equipe_${p.id}`} defaultValue={s.equipe ?? ""} aria-label={`${tp.adicionarEquipe} ${p.name}`} className={CAMPO_COMPACTO}>
                      <option value="">{tp.adicionarEquipe}</option>
                      {equipes.filter((e) => !e.gestao).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  )}
                  <input name={`whats_${p.id}`} defaultValue={p.whatsapp} placeholder={tp.whatsapp} aria-label={`${tp.whatsapp}: ${p.name}`} inputMode="tel" className={CAMPO_COMPACTO} />
                  <input name={`email_${p.id}`} defaultValue={p.email} placeholder={tp.email} aria-label={`${tp.email}: ${p.name}`} type="email" className={CAMPO_COMPACTO} />
                </div>
              </div>
            );
          })}
          <div className="sticky bottom-24 z-10 mt-2 md:bottom-4"><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{tp.salvarFichas}</BotaoEnviar></div>
        </form>
      )}
      <ToastAoAbrir texto={q.ok ? `${tp.salvas}: ${q.ok}` : undefined} />
    </div>
  );
}
