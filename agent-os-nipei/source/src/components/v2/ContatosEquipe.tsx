import Avatar from "@/components/ds/Avatar";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import { EstadoVazio } from "@/components/ds/Estados";
import Icone from "@/components/ds/Icone";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { createPessoaAction } from "@/app/(v2)/actions";
import { PONTE_TIPOS, reconectarEm, type Equipe, type Pessoa } from "@/lib/v2/data";
import { fmtDate, type Dict, type Lang } from "@/lib/v2/i18n";

const sem = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const foto = (p: Pessoa) => (p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined);

// Página de uma equipe de contatos (Pontes): cartões de contato em grade, busca e tipo (DESIGN-SYSTEM.md 10.12).
export default function ContatosEquipe({ e, pessoas, gerir, q, hoje, t, lang }: {
  e: Equipe; pessoas: Pessoa[]; gerir: boolean; q: { q?: string; tipo?: string }; hoje: string; t: Dict; lang: Lang;
}) {
  const tp = t.ponte;
  const todos = pessoas.filter((p) => p.equipes.includes(e.id));
  const palavras = sem(q.q ?? "").split(/\s+/).filter(Boolean);
  const tipo = (PONTE_TIPOS as readonly string[]).includes(q.tipo ?? "") ? q.tipo! : "";
  const lista = todos
    .filter((p) => !tipo || p.ponte.tipo === tipo)
    .filter((p) => { const txt = sem([p.name, p.ponte.empresa, ...p.ponte.oferece, p.ponte.comoConhecemos].join(" ")); return palavras.every((w) => txt.includes(w)); })
    .map((p) => ({ p, quando: reconectarEm(p) }))
    // due to reconnect first, then by name
    .sort((a, b) => Number(!!b.quando && b.quando <= hoje) - Number(!!a.quando && a.quando <= hoje) || a.p.name.localeCompare(b.p.name, "pt"));
  const link = (o: Record<string, string | undefined>) => `/equipes/${e.id}?` + new URLSearchParams(Object.entries({ q: q.q, tipo, ...o }).filter(([, v]) => v) as [string, string][]);
  const nome = (id: string) => pessoas.find((p) => p.id === id);

  return (
    <>
      <div className="-ml-3 mb-2"><Botao href="/equipes" variante="fantasma" tamanho="P" icone="voltar">{t.equipes}</Botao></div>
      <CabecalhoPagina selo="pontes" rotulo={e.coordenadores.length ? `${t.coordenacao}: ${e.coordenadores.map((c) => nome(c)?.name.split(" ")[0] ?? c).join(", ")}` : t.equipes}
        titulo={e.nome} subtitulo={`${todos.length} ${todos.length === 1 ? tp.contato : tp.contatos.toLowerCase()}`}
        filtros={<>
          <Chip ativo={!tipo} href={link({ tipo: undefined })} contagem={todos.length}>{tp.todos}</Chip>
          {PONTE_TIPOS.map((x) => { const n = todos.filter((p) => p.ponte.tipo === x).length; return n > 0 && <Chip key={x} ativo={tipo === x} href={link({ tipo: tipo === x ? undefined : x })} contagem={n}>{tp.tipos[x]}</Chip>; })}
        </>} />

      <form className="mb-4" action={`/equipes/${e.id}`}>
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <Campo tipo="busca" name="q" rotulo={tp.buscar} defaultValue={q.q} />
      </form>

      {gerir && (
        <details className="mb-4 rounded-cartao bg-s1">
          <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="mais" tamanho={18} />{tp.novoContato}</summary>
          <form action={createPessoaAction} className="grid gap-2 px-4 pb-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <input type="hidden" name="equipe" value={e.id} />
            <Campo name="name" rotulo={tp.nomeContato} required maxLength={120} className="bg-s2" />
            <BotaoEnviar enviando="…" icone="mais" variante="primario">{tp.criar}</BotaoEnviar>
          </form>
        </details>
      )}

      {lista.length === 0
        ? <EstadoVazio selo="pontes" titulo={todos.length ? tp.nenhumFiltro : tp.nenhum} texto={todos.length ? undefined : tp.nenhumAjuda} />
        : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map(({ p, quando }) => {
              const b = p.ponte, v = nome(b.vinculo), devido = !!quando && quando <= hoje;
              return (
                <li key={p.id}>
                  <Cartao variante="clicavel" href={`/pessoas/${p.id}`} equipe={e.id} className="h-full">
                    <div className="flex items-center gap-3">
                      <Avatar nome={p.name} foto={foto(p)} tamanho={40} />
                      <div className="min-w-0 flex-1">
                        <p className="titulo-cartao truncate">{p.name}</p>
                        <p className="meta truncate text-t2">{[b.empresa, tp.tipos[b.tipo]].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                    </div>
                    {b.oferece.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {b.oferece.slice(0, 3).map((o) => <Chip key={o} tipo="metadado">{o}</Chip>)}
                        {b.oferece.length > 3 && <Chip tipo="metadado">+{b.oferece.length - 3}</Chip>}
                      </span>
                    )}
                    <div className="mt-auto flex items-center gap-2">
                      {v ? <span className="meta inline-flex min-w-0 items-center gap-1.5 text-t2"><Avatar nome={v.name} foto={foto(v)} tamanho={24} /><span className="truncate">{v.name.split(" ")[0]}</span></span>
                        : <span className="meta text-t3">{tp.semVinculo.split(" (")[0]}</span>}
                      <span className="ml-auto">
                        {devido ? <BadgeEstado estado="aviso">{tp.reconectar}</BadgeEstado>
                          : b.conversas[0] && <span className="meta text-t3">{fmtDate(b.conversas[0].data, lang)}</span>}
                      </span>
                    </div>
                  </Cartao>
                </li>
              );
            })}
          </ul>
        )}
    </>
  );
}
