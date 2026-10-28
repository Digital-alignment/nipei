import Link from "next/link";
import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Botao from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import Aviso from "@/components/ds/Aviso";
import Icone from "@/components/ds/Icone";
import { chaveEquipe } from "@/components/ds/equipes";
import LinhaDoTempo, { type ItemTempo } from "@/components/ds/padroes/LinhaDoTempo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser, getEquipes, getPessoas, getProjetos } from "@/lib/v2/data";
import { diaLocal, getFatos, getFontes, podeRevisar, usoFatos, versoesFato, type Fato } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { corrigirFatoAction } from "../../../actions";

// One fact: text, links, source, how often the AIs used it (D11), correction (D10) and its history —
// every version (`corrige` / `substituidoPor`) plus who confirmed, set the team, corrected or discarded it.
export default async function FatoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const fatos = getFatos();
  const f = fatos.find((x) => x.id === id);
  if (!f) notFound();
  const fonte = getFontes().find((x) => x.id === f.fonte);
  const equipes = getEquipes(), projetos = getProjetos(), pessoas = getPessoas();
  const versoes = versoesFato(f.id, fatos);
  const atual = versoes[versoes.length - 1];
  // usage counts every version: it is the same knowledge, reworded
  const usos = usoFatos();
  const uso = versoes.reduce((a, v) => {
    const u = usos[v.id];
    if (!u) return a;
    for (const [o, n] of Object.entries(u.origens)) a.origens[o] = (a.origens[o] ?? 0) + n;
    return { n: a.n + u.n, ultimo: u.ultimo > a.ultimo ? u.ultimo : a.ultimo, origens: a.origens };
  }, { n: 0, ultimo: "", origens: {} as Record<string, number> });
  const dia = (iso: string) => fmtDate(diaLocal(iso), lang);
  const hora = (iso: string) => (iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" }) : undefined);

  // history, oldest first, then shown newest first
  const itens: (ItemTempo & { em: string })[] = [];
  versoes.forEach((v: Fato, i) => {
    if (i === 0) itens.push({ em: v.criadoEm, dia: dia(v.criadoEm), hora: hora(v.criadoEm), tipo: "pinu", quem: "Pinu", texto: `${t.iaPropos} ${fonte?.titulo || v.fonte}`, comentario: v.texto });
    else itens.push({ em: v.criadoEm, dia: dia(v.criadoEm), hora: hora(v.criadoEm), tipo: "estado", quem: v.revisadoPor || "?", texto: t.corrigiuPara, antes: versoes[i - 1].texto, depois: v.texto });
    if (v.equipeDefinidaEm) itens.push({ em: v.equipeDefinidaEm, dia: dia(v.equipeDefinidaEm), hora: hora(v.equipeDefinidaEm), tipo: "outro", quem: v.equipeDefinidaPor, texto: `${t.definiuEquipe}: ${equipes.find((e) => e.id === v.equipe)?.nome ?? t.semEquipeFato}` });
    if (i === 0 && v.revisadoEm && (v.status === "confirmado" || v.status === "substituido")) itens.push({ em: v.revisadoEm, dia: dia(v.revisadoEm), hora: hora(v.revisadoEm), tipo: "concluiu", quem: v.revisadoPor, texto: t.confirmou });
    if (v.status === "descartado") itens.push({ em: v.revisadoEm, dia: dia(v.revisadoEm), hora: hora(v.revisadoEm), tipo: "outro", quem: v.revisadoPor, texto: t.descartou });
  });
  itens.sort((a, b) => b.em.localeCompare(a.em));

  const equipe = equipes.find((e) => e.id === f.equipe);
  const ligados = [
    ...(equipe ? [<Chip key={equipe.id} tipo={chaveEquipe(equipe.id) ? "equipe" : "filtro"} equipe={equipe.id} href={`/equipes/${equipe.id}`}>{equipe.nome}</Chip>] : []),
    ...f.projetos.map((p) => <Chip key={p} icone="tarefa" href={`/projetos/${p}`}>{projetos.find((x) => x.id === p)?.nome ?? p}</Chip>),
    ...f.pessoas.map((h) => <Chip key={h} icone="pessoa" href={`/pessoas/${h}`}>{pessoas.find((x) => x.id === h)?.name.split(" (")[0] ?? h}</Chip>),
  ];
  const statusTxt = { proposto: t.status_proposto, confirmado: t.status_confirmado, substituido: t.status_substituido, descartado: t.status_descartado }[f.status];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="-ml-3 mb-2"><Botao href="/conhecimento#base" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" rotulo={`${t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo} · ${statusTxt}`} titulo={t.fatoLbl}
        filtros={ligados.length ? <>{ligados}</> : undefined} />

      {f.status === "substituido" && atual && atual.id !== f.id && (
        <Aviso estado="info" className="mb-4" titulo={t.foiCorrigido}
          acoes={<Botao href={`/conhecimento/fato/${atual.id}`} icone="avancar" variante="tonal" tamanho="P">{t.verVersaoAtual}</Botao>} />
      )}

      <Cartao className="mb-6 grid gap-4">
        <p className={`corpo text-t1 ${f.status === "descartado" || f.status === "substituido" ? "text-t3 line-through" : ""}`}>{f.texto}</p>
        {fonte && (
          <Link href={`/conhecimento/${fonte.id}`} className="anel-foco alvo-toque meta inline-flex items-start gap-1.5 justify-self-start rounded-interno text-t2 hover:text-t1 hover:underline">
            <Icone nome="abrir-fora" tamanho={14} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{t.deFonte}: {fonte.titulo || fonte.url}</span>
          </Link>
        )}
        <div className="grid gap-1 border-t border-s2 pt-4">
          <span className="rotulo-maiusculo text-t3">{t.usadoIA}</span>
          {uso.n ? (
            <p className="meta text-t2">
              <span className="font-semibold text-t1">{uso.n} {uso.n === 1 ? t.vez : t.vezes}</span> · {t.ultimaVez} {dia(uso.ultimo)} · {Object.entries(uso.origens).sort((a, b) => b[1] - a[1]).map(([o, n]) => `${t.origensUso[o] ?? o} ${n}`).join(" · ")}
            </p>
          ) : <p className="meta text-t3">{t.nuncaUsado}</p>}
        </div>
      </Cartao>

      {f.status === "confirmado" && podeRevisar(me, f) && (
        <form action={corrigirFatoAction} className="mb-8 grid gap-2">
          <input type="hidden" name="id" value={f.id} />
          <h2 className="titulo-secao inline-flex items-center gap-2"><Icone nome="editar" tamanho={20} />{t.corrigirFatoLbl}</h2>
          <Campo tipo="area" name="texto" rotulo={t.textoCorrigido} defaultValue={f.texto} rows={3} maxLength={600} required />
          <p className="meta text-t3">{t.corrigirAjuda}</p>
          <BotaoEnviar enviando="…" icone="confirmar" variante="tonal" className="justify-self-start">{t.corrigirFatoLbl}</BotaoEnviar>
        </form>
      )}

      <section className="mb-8 grid gap-3">
        <h2 className="titulo-secao">{t.historico}</h2>
        <LinhaDoTempo itens={itens} />
      </section>
    </div>
  );
}
