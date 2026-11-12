import { notFound, redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao from "@/components/ds/Botao";
import Aviso from "@/components/ds/Aviso";
import Icone from "@/components/ds/Icone";
import { Interruptor } from "@/components/ds/Controles";
import { ToastAoAbrir } from "@/components/ds/Toast";
import LinhaDoTempo, { type ItemTempo } from "@/components/ds/padroes/LinhaDoTempo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import EnviarComConfirmacao from "@/components/v2/EnviarComConfirmacao";
import Upload from "@/components/v2/Upload";
import { CATEGORIAS, currentUser, getContas, getEquipes, getLancamentos, getPessoas, getProjetos } from "@/lib/v2/data";
import { BadgeEstado } from "@/components/ds/Chip";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { anularLancamentoAction, comprovanteAction, editarLancamentoAction } from "../../actions";

// Ficha do lançamento (DS 10.25, gestão): comprovante, editar (each change goes to the history), histórico, anular.
export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const valorBR = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function LancamentoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const todos = getLancamentos();
  const l = todos.find((x) => x.id === id);
  if (!l) notFound();
  const { t, lang } = await getT();
  const projetos = getProjetos(), equipes = getEquipes();
  const contasAtivas = getContas().filter((c) => c.ativa || c.id === l.conta);
  const eventos = [...new Set(todos.filter((x) => x.evento && !x.anulado).map((x) => x.evento))];
  const dia = (iso: string) => fmtDate(iso, lang);
  const quemCriou = getPessoas().find((p) => p.id === l.registradoPor)?.name.split(" (")[0] ?? l.registradoPor;
  const titulo = l.descricao || l.categoria;
  const pdf = l.comprovante.endsWith(".pdf");
  const src = `/financas/${encodeURIComponent(l.id)}/comprovante?v=${encodeURIComponent(l.historico.find((h) => /comprovante/i.test(h.texto))?.quando ?? "")}`;

  // newest first, as written; the creation goes last (only entries created since this version have registrado_em)
  const itens: ItemTempo[] = l.historico.map((h) => {
    const m = h.texto.match(/^(.+?): (.*) → (.*)$/);
    const base = { dia: dia(h.quando.slice(0, 10)), hora: h.quando.slice(11, 16), quem: h.quem };
    if (m) return { ...base, tipo: "estado", texto: m[1].toLowerCase(), antes: m[2], depois: m[3] };
    return { ...base, tipo: /pago|recebido/i.test(h.texto) ? "concluiu" : "outro", texto: h.texto.charAt(0).toLowerCase() + h.texto.slice(1) };
  });
  if (l.registradoEm) itens.push({ dia: dia(l.registradoEm.slice(0, 10)), hora: l.registradoEm.slice(11, 16), tipo: "outro", quem: quemCriou, texto: `${l.importacao ? t.importouLanc : t.registrouLanc}${l.registradoVia ? ` (via ${l.registradoVia})` : ""}` });

  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={titulo}
        subtitulo={<>{l.tipo === "entrada" ? t.entrada : t.despesa} · <span className={`font-semibold ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span> · {dia(l.data)}{l.conciliado && <> <BadgeEstado estado="feita">{t.conciliadoLbl}</BadgeEstado></>}</>}
        acoes={<Botao href={`/financas?m=${l.data.slice(0, 7)}`} icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />
      <ToastAoAbrir texto={q.ok} />
      {l.anulado && <Aviso estado="atencao" titulo={`${t.anuladoTitulo}${l.anuladoEm ? ` · ${dia(l.anuladoEm)}` : ""}`} mensagem={t.anuladoExplica} className="mb-6" />}

      <Cartao className="mb-6">
        <p className="titulo-cartao">{t.comprovante}</p>
        {l.comprovante ? (
          pdf ? <div className="mt-3"><Botao href={src} icone="abrir-fora" variante="tonal" tamanho="M" target="_blank">{t.abrirPdf}</Botao></div>
            : <a href={src} target="_blank" className="anel-foco mt-3 block w-fit rounded-interno">
              {/* eslint-disable-next-line @next/next/no-img-element -- private file behind the session, not for next/image */}
              <img src={src} alt={`${t.comprovante}: ${titulo}`} className="max-h-80 rounded-interno" />
            </a>
        ) : <p className="meta mt-1 text-t2">{t.semComprovante}</p>}
        {!l.anulado && <div className="mt-4">
          <Upload id={l.id} action={comprovanteAction} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
            labels={{ arquivo: l.comprovante ? t.trocarComprovante : t.anexarComprovante, foto: t.foto, enviando: t.enviando, maximo: "Máximo 10 MB" }} />
          <p className="meta mt-2 text-t3">{t.comprovanteTipos}</p>
        </div>}
      </Cartao>

      {!l.anulado && (
        <section className="mb-8 grid gap-3">
          <h2 className="titulo-secao inline-flex items-center gap-2"><Icone nome="editar" tamanho={20} />{t.editar}</h2>
          <form action={editarLancamentoAction} className="grid gap-3">
            <input type="hidden" name="id" value={l.id} />
            <div className="flex flex-wrap gap-2">
              {([["despesa", t.despesa], ["entrada", t.entrada]] as const).map(([v, rot]) => (
                <label key={v} className="anel-foco inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                  <input type="radio" name="tipo" value={v} defaultChecked={v === l.tipo} className="sr-only" /><Icone nome={v === "entrada" ? "mais" : "baixar"} tamanho={16} />{rot}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo tipo="data" name="data" rotulo={t.data} defaultValue={l.data} required />
              <Campo name="valor" rotulo={t.valor} inputMode="decimal" defaultValue={valorBR(l.valor)} required />
            </div>
            <Campo tipo="selecao" name="categoria" rotulo={t.categoria} defaultValue={l.categoria}>
              <optgroup label={t.despesas}>{CATEGORIAS.despesa.map((c) => <option key={c}>{c}</option>)}</optgroup>
              <optgroup label={t.entradas}>{CATEGORIAS.entrada.map((c) => <option key={c}>{c}</option>)}</optgroup>
            </Campo>
            <Campo name="descricao" rotulo={t.descricao} maxLength={200} defaultValue={l.descricao} />
            <div className="grid grid-cols-2 gap-3">
              <Campo name="evento" rotulo={t.eventoFin} list="eventos-lanc" maxLength={80} placeholder={t.eventoFinEx} defaultValue={l.evento} />
              <Campo name="participante" rotulo={t.participante} maxLength={80} defaultValue={l.participante} />
            </div>
            <datalist id="eventos-lanc">{eventos.map((e) => <option key={e} value={e} />)}</datalist>
            <label className="flex min-h-11 items-center justify-between gap-3 font-texto text-sm text-t1">{t.aindaNaoPago}<Interruptor name="pendente" rotulo={t.aindaNaoPago} padrao={l.pendente} /></label>
            <div className="grid grid-cols-2 gap-3">
              <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue={l.projeto}><option value="">{t.geral}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
              <Campo tipo="selecao" name="equipe" rotulo={t.equipe} defaultValue={l.equipe}><option value="">{t.nenhum}</option>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Campo>
            </div>
            {contasAtivas.length > 0 && <Campo tipo="selecao" name="conta" rotulo={t.contaLbl} defaultValue={l.conta}><option value="">—</option>{contasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Campo>}
            <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.salvarAlteracoes}</BotaoEnviar></div>
          </form>
        </section>
      )}

      <section className="mb-8 grid gap-3">
        <h2 className="titulo-secao">{t.historico}</h2>
        <LinhaDoTempo itens={itens} vazio={<p className="meta text-t3">{t.semHistorico}</p>} />
      </section>

      {!l.anulado && (
        <form action={anularLancamentoAction} className="mb-8">
          <input type="hidden" name="id" value={l.id} />
          <EnviarComConfirmacao icone="fechar" variante="fantasma" perigoso confirmarRotulo={t.anular} textoCarregando="…"
            pergunta={`${t.anular}: ${titulo}?`} mensagem={t.anularExplica}>{t.anularLancamento}</EnviarComConfirmacao>
        </form>
      )}
    </div>
  );
}
