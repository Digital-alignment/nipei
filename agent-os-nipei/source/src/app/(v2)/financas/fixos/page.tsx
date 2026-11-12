import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Icone from "@/components/ds/Icone";
import { BadgeEstado } from "@/components/ds/Chip";
import { ToastAoAbrir } from "@/components/ds/Toast";
import Tabela from "@/components/ds/padroes/Tabela";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { CATEGORIAS, currentUser, getProjetos, today } from "@/lib/v2/data";
import { custoFixo, getFixos } from "@/lib/v2/fixos";
import { getT } from "@/lib/v2/i18n";
import { fixoAtivoAction, salvarFixoAction } from "../../actions";

// Gastos fixos (DS 10.25, gestão): fixed monthly costs (or incomes) that become a pending entry every month.
export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const valorBR = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function GastosFixos({ searchParams }: { searchParams: Promise<{ editar?: string; ok?: string }> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const q = await searchParams;
  const { t } = await getT();
  const fixos = getFixos(), projetos = getProjetos();
  const ed = fixos.find((f) => f.id === q.editar);
  const custo = custoFixo(fixos);

  return (
    <>
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={t.gastosFixos}
        subtitulo={<>{t.custoFixoMensal}: {brl(custo.despesas)}{custo.entradas ? ` · ${t.entradasFixas} ${brl(custo.entradas)}` : ""}</>}
        acoes={<Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />
      <ToastAoAbrir texto={q.ok} />
      <p className="corpo mb-4 max-w-2xl text-t2">{t.fixosExplica}</p>

      <Tabela rotulo={t.gastosFixos} vazio={<p className="meta text-t3">{t.semFixos}</p>} colunas={[
        { id: "desc", rotulo: t.descricao }, { id: "dia", rotulo: t.diaDoMes, numero: true }, { id: "cat", rotulo: t.categoria, soComputador: true }, { id: "valor", rotulo: t.valor, numero: true },
      ]} linhas={fixos.map((f) => ({
        id: f.id, apagada: !f.ativo,
        celulas: {
          desc: <span className="inline-flex flex-wrap items-center gap-2">{f.descricao}{!f.ativo && <BadgeEstado estado="interna">{t.fixoPausado}</BadgeEstado>}</span>,
          dia: String(f.dia), cat: f.categoria,
          valor: <span className={`font-semibold ${f.tipo === "entrada" ? "text-ok" : "text-err"}`}>{f.tipo === "entrada" ? "+" : "−"}{brl(f.valor)}</span>,
        },
        acoes: (
          <span key={f.id} className="inline-flex items-center gap-1">
            <BotaoIcone icone="editar" aria-label={`${t.editar}: ${f.descricao}`} tamanho={40} variante="fantasma" href={`/financas/fixos?editar=${f.id}#form-fixo`} />
            <form action={fixoAtivoAction}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="ativo" value={f.ativo ? "0" : "1"} />
              <BotaoEnviar enviando="…" icone={f.ativo ? "fechar" : "confirmar"} variante="fantasma">{f.ativo ? t.pausar : t.reativar}</BotaoEnviar></form>
          </span>
        ),
      }))} />

      <Cartao className="mt-6 max-w-2xl">
        <form id="form-fixo" action={salvarFixoAction} className="grid gap-3" key={ed?.id ?? "novo"}>
          <p className="titulo-cartao inline-flex items-center gap-2"><Icone nome={ed ? "editar" : "mais"} tamanho={18} />{ed ? t.editarFixo : t.novoFixo}</p>
          {ed && <input type="hidden" name="id" value={ed.id} />}
          <div className="flex flex-wrap gap-2">
            {([["despesa", t.despesa], ["entrada", t.entrada]] as const).map(([v, rot]) => (
              <label key={v} className="anel-foco inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                <input type="radio" name="tipo" value={v} defaultChecked={v === (ed?.tipo ?? "despesa")} className="sr-only" /><Icone nome={v === "entrada" ? "mais" : "baixar"} tamanho={16} />{rot}
              </label>
            ))}
          </div>
          <Campo name="descricao" rotulo={t.descricao} maxLength={120} defaultValue={ed?.descricao} placeholder={t.fixoEx} required />
          <div className="grid grid-cols-2 gap-3">
            <Campo name="valor" rotulo={t.valor} inputMode="decimal" placeholder="0,00" defaultValue={ed ? valorBR(ed.valor) : undefined} required />
            <Campo name="dia" rotulo={t.diaDoMes} inputMode="numeric" type="number" min={1} max={28} defaultValue={ed?.dia ?? 10} required />
          </div>
          <Campo tipo="selecao" name="categoria" rotulo={t.categoria} defaultValue={ed?.categoria ?? "Comunicação e internet"}>
            <optgroup label={t.despesas}>{CATEGORIAS.despesa.map((c) => <option key={c}>{c}</option>)}</optgroup>
            <optgroup label={t.entradas}>{CATEGORIAS.entrada.map((c) => <option key={c}>{c}</option>)}</optgroup>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue={ed?.projeto ?? "santuario"}><option value="">{t.geral}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
            <Campo name="inicio" rotulo={t.comecaEm} type="month" placeholder="AAAA-MM" defaultValue={ed?.inicio ?? today().slice(0, 7)} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.salvar}</BotaoEnviar>
            {ed && <Botao href="/financas/fixos" variante="fantasma" tamanho="M" icone="fechar">{t.cancelar}</Botao>}
          </div>
        </form>
      </Cartao>
    </>
  );
}
