import Icone from "@/components/ds/Icone";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Title } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import EscolherEquipes from "@/components/v2/EscolherEquipes";
import { contagemNotas } from "@/lib/v2/notasInternas";
import { currentUser, getEquipes, getPessoas, type Pessoa } from "@/lib/v2/data";
import { organizacao } from "@/lib/v2/organizacao";
import { getT } from "@/lib/v2/i18n";
import { addToEquipeAction, coordenacaoAction, externoAction, funcaoAction } from "../../actions";

const CARTAO = "rounded-cartao bg-s1 p-4";
const ROTULO = "rotulo-maiusculo text-t3";
const campo = "anel-foco h-9 rounded-pilula bg-s2 px-3 font-texto text-sm text-t1 outline-none focus:shadow-foco";
const btn = "anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]";
const sec = "anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s3 px-3.5 font-texto text-sm font-semibold text-t1 hover:bg-s4 text-t2";

// Gestão: decide who belongs to each team. Team membership is what task assignment uses, so it is set
// here even for people whose team has no platform access yet (or whose access is suspended).
export default async function OrganizarEquipes() {
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const equipes = getEquipes(), pessoas = getPessoas();
  const o = organizacao();
  const notas = contagemNotas();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(/[\s(]/)[0] ?? id;
  const foto = (p: Pessoa) => (p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/pessoas" className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{t.pessoas}</Link>
      <Title sub={t.organizarIntro}>{t.organizarEquipes}</Title>

      <div className={`${CARTAO} mb-6`}>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-sm font-medium">{t.organizadas.replace("{n}", String(o.comEquipe)).replace("{total}", String(o.total))}</p>
          <p className="text-sm font-semibold tabular-nums">{o.pct}%</p>
        </div>
        <div className="h-2 rounded-pilula bg-s2 overflow-hidden"><div className="h-full bg-ac" style={{ width: `${o.pct}%` }} /></div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-t2">
          <span>{o.semEquipe.length} {t.semEquipeCurto}</span>
          <span>{o.semCoordenacao.length} {t.equipesSemCoord}</span>
          <span>{o.semFuncao.length} {t.semFuncaoCurto}</span>
          <span>{o.externos.length} {t.contatosExternos.toLowerCase()}</span>
        </div>
      </div>

      {o.semEquipe.length > 0 && (
        <section className="mb-8">
          <p className={`${ROTULO} mb-1`}>{t.aindaSemEquipe} ({o.semEquipe.length})</p>
          <p className="text-xs text-t2 mb-3">{t.aindaSemEquipeAjuda}</p>
          <ul className={`${CARTAO} !p-0 divide-y divide-s2`}>
            {o.semEquipe.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <Link href={`/pessoas/${p.id}`} className="flex items-center gap-2.5 flex-1 min-w-40 hover:underline">
                  <Avatar name={p.name} size={30} src={foto(p)} />
                  <span className="text-sm">{p.name}</span>
                </Link>
                <EscolherEquipes pessoaId={p.id} equipes={equipes} t={t} notas={notas[p.id]} />
                <form action={externoAction}>
                  <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="externo" value="true" />
                  <BotaoEnviar enviando="…" className={`${sec} inline-flex items-center gap-1`}><Icone nome="pessoa"  tamanho={13} />{t.marcarExterno}</BotaoEnviar>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <p className={`${ROTULO} mb-3`}>{t.equipes}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {equipes.map((e) => {
            const membros = pessoas.filter((p) => p.equipes.includes(e.id)).sort((a, b) => Number(e.coordenadores.includes(b.id)) - Number(e.coordenadores.includes(a.id)) || a.name.localeCompare(b.name, "pt"));
            return (
              <div key={e.id} className={`${CARTAO} grid gap-3 content-start`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-pilula" style={{ background: e.cor }} />
                  <Link href={`/equipes/${e.id}`} className="font-medium text-sm flex-1 min-w-0 hover:underline">{e.nome}</Link>
                  <span className="text-xs text-t2 tabular-nums">{membros.length}</span>
                  {!e.acesso && <span title={t.equipeSemAcessoAjuda} className="text-t3"><Icone nome="cadeado"  tamanho={13} /></span>}
                </div>
                {e.coordenadores.length
                  ? <p className="text-xs text-t2">{t.coordenacao}: {e.coordenadores.map((c) => nome(c) + (pessoas.find((p) => p.id === c)?.equipes.includes(e.id) ? "" : ` (${t.geralCurto})`)).join(", ")}</p>
                  : <p className="text-xs text-warn inline-flex items-center gap-1"><Icone nome="atencao"  tamanho={12} />{t.semCoordenacaoAviso}</p>}
                <form action={coordenacaoAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="equipe" value={e.id} /><input type="hidden" name="coordena" value="true" />
                  <select name="pessoa" required defaultValue="" aria-label={t.adicionarCoordenacao} className={`${campo} flex-1 min-w-0 text-xs`}>
                    <option value="" disabled>{t.adicionarCoordenacao}</option>
                    {pessoas.filter((p) => !p.externo && !e.coordenadores.includes(p.id)).sort((a, b) => Number(b.equipes.includes(e.id)) - Number(a.equipes.includes(e.id)) || a.name.localeCompare(b.name, "pt"))
                      .map((p) => <option key={p.id} value={p.id}>{p.name}{p.equipes.includes(e.id) ? "" : ` (${t.geralCurto})`}</option>)}
                  </select>
                  <BotaoEnviar enviando="…" className={sec}>{t.adicionar}</BotaoEnviar>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  {membros.map((p) => (
                    <Link key={p.id} href={`/pessoas/${p.id}`} title={p.funcao || t.funcaoNaoDefinida}
                      className={`inline-flex items-center gap-1 rounded-pilula bg-s2 px-2.5 py-1 text-xs  ${e.coordenadores.includes(p.id) ? "shadow-[inset_0_0_0_1px_var(--s4)] font-medium text-t1" : "text-t2"}`}>
                      {p.name.split(/[\s(]/)[0]}{p.suspenso && <Icone nome="cadeado"  tamanho={10} aria-label={t.suspensoLbl} className="opacity-60" />}
                    </Link>
                  ))}
                  {!membros.length && <span className="text-xs text-t3">{t.semMembros}</span>}
                </div>
                <form action={addToEquipeAction} className="flex items-center gap-1.5">
                  <select name="pessoa" required defaultValue="" aria-label={t.adicionarPessoa} className={`${campo} flex-1 min-w-0`}>
                    <option value="" disabled>{t.adicionarPessoa}</option>
                    {pessoas.filter((p) => !p.externo && !p.equipes.includes(e.id)).sort((a, b) => Number(!!a.equipes.length) - Number(!!b.equipes.length) || a.name.localeCompare(b.name, "pt"))
                      .map((p) => <option key={p.id} value={p.id}>{p.name}{p.equipes.length ? "" : ` · ${t.semEquipeCurto}`}</option>)}
                  </select>
                  <input type="hidden" name="equipe" value={e.id} />
                  <BotaoEnviar enviando="…" className={btn}>{t.adicionar}</BotaoEnviar>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {o.semFuncao.length > 0 && (
        <section className="mb-8">
          <p className={`${ROTULO} mb-1`}>{t.semFuncaoTitulo} ({o.semFuncao.length})</p>
          <p className="text-xs text-t2 mb-3">{t.semFuncaoAjuda}</p>
          <ul className={`${CARTAO} !p-0 divide-y divide-s2`}>
            {o.semFuncao.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <Link href={`/pessoas/${p.id}`} className="flex items-center gap-2.5 flex-1 min-w-40 hover:underline">
                  <Avatar name={p.name} size={30} src={foto(p)} />
                  <span className="text-sm">{p.name}</span>
                  <span className="flex gap-1">{p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && <span key={id} title={e.nome} className="w-2 h-2 rounded-pilula" style={{ background: e.cor }} />; })}</span>
                </Link>
                <form action={funcaoAction} className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input type="hidden" name="pessoa" value={p.id} />
                  <input name="funcao" required maxLength={80} placeholder={t.funcaoExemplo} className={`${campo} flex-1 min-w-0 sm:flex-none sm:w-48`} />
                  <BotaoEnviar enviando="…" className={btn}>{t.salvar}</BotaoEnviar>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {o.externos.length > 0 && (
        <details className={`${CARTAO} mb-6`}>
          <summary className="cursor-pointer text-sm font-medium">{t.contatosExternos} ({o.externos.length})</summary>
          <p className="text-xs text-t2 mt-2 mb-2">{t.contatosExternosAjuda}</p>
          <ul className="divide-y divide-s2">
            {o.externos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Link href={`/pessoas/${p.id}`} className="text-sm flex-1 hover:underline">{p.name}</Link>
                <form action={externoAction}>
                  <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="externo" value="false" />
                  <BotaoEnviar enviando="…" className={sec}>{t.voltarPessoa}</BotaoEnviar>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
