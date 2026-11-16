"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTarefaAction, sugerirTarefaAction, updateTarefaAction } from "@/app/(v2)/actions";
import type { SugestaoTarefa } from "@/lib/v2/sugestaoTarefa";
import Campo, { SugestaoPinu } from "@/components/ds/Campo";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import Avatar from "@/components/ds/Avatar";

type Equipe = { id: string; nome: string; cor: string; areas: string[] };
type Pessoa = { id: string; nome: string; equipes: string[]; coordena: string[]; suspenso: boolean; foto?: string };
type L = Record<"titulo" | "tituloPh" | "descricao" | "descricaoPh" | "equipe" | "nenhum" | "area" | "prioridade" | "prazo" | "hoje" | "amanha" | "sexta" | "proximaSemana" | "semPrazo"
  | "repetir" | "naoRepete" | "semanal" | "quinzenal" | "mensal" | "repeteAviso" | "projeto" | "objetivo" | "responsaveis" | "buscarPessoa" | "eu" | "checklist" | "checklistPh"
  | "criar" | "criarOutra" | "outra" | "cancelar" | "suspenso" | "nenhumaPessoa" | "salvar" | "status" | "aFazer" | "fazendo" | "feito", string> & { prio: Record<string, string>; grupos: Record<"equipe" | "outras" | "sem", string> };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mais = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const proxDia = (dow: number, minimo = 1) => { const d = mais(minimo); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; };
const sn = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
// chip que marca (rádio/caixa escondidos): mesmo visual do Chip de filtro do design system
const CHIP = "anel-foco inline-flex h-9 cursor-pointer select-none items-center gap-2 rounded-pilula bg-s2 pl-1.5 pr-3.5 font-texto text-sm font-medium text-t2 hover:bg-s3 hover:text-t1 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)] has-[:focus-visible]:shadow-foco";
const PRIO_ICONE: Record<string, "prazo" | "informacao" | "atencao"> = { baixa: "prazo", "média": "informacao", alta: "atencao", urgente: "atencao" };
const PRIO_COR: Record<string, string> = { baixa: "text-t3", "média": "text-info", alta: "text-warn", urgente: "text-err" };

function Enviar({ children, ...p }: { children: React.ReactNode; name?: string; value?: string; variante?: "primario" | "tonal"; folha?: boolean; icone: "confirmar" | "mais" }) {
  const { pending } = useFormStatus();
  return <Botao type="submit" name={p.name} value={p.value} variante={p.variante} folha={p.folha} icone={p.icone} carregando={pending} textoCarregando="…">{children}</Botao>;
}

/** "Nova tarefa" and "Editar tarefa" (DS 10.26): everything a task can carry in one screen; people grouped by the chosen team, with search. */
export default function NovaTarefaForm({ equipes, pessoas, projetos, objetivos, inicial, podeSemEquipe, meId, back, l, editar, pinu }: {
  equipes: Equipe[]; pessoas: Pessoa[]; projetos: { id: string; nome: string }[]; objetivos: { id: string; titulo: string; ano: number; projeto: string }[];
  inicial: { equipe: string; projeto: string; objetivo: string; prazo: string; responsaveis: string[]; status?: string }; podeSemEquipe: boolean; meId: string; back: string; l: L;
  /** editing an existing task: description and checklist stay in the task page */
  editar?: { id: string; title: string; status: string; prioridade: string; recorrencia: string; area: string };
  /** the Pinu suggests team, priority, due date, owners and project from the title (only when creating) */
  pinu?: boolean;
}) {
  const [equipe, setEquipe] = useState(inicial.equipe);
  const [projeto, setProjeto] = useState(inicial.projeto);
  const [prazo, setPrazo] = useState(inicial.prazo);
  const [sel, setSel] = useState(new Set(inicial.responsaveis));
  const [busca, setBusca] = useState("");
  const [prio, setPrio] = useState(editar?.prioridade || "média");
  // Pinu suggestion (DS 10.26): asks 1.5 s after typing stops, only for a new title of 12+ characters
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sug, setSug] = useState<{ s: SugestaoTarefa; texto: string } | null>(null);
  const [pensando, setPensando] = useState(false);
  const pedido = useRef("");
  const descrever = (s: SugestaoTarefa) => {
    const nomeP = (id: string) => pessoas.find((p) => p.id === id)?.nome.split(" (")[0] ?? id;
    const dia = s.prazo ? new Date(`${s.prazo}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "";
    const partes = [equipes.find((e) => e.id === s.equipe)?.nome, s.prioridade && l.prio[s.prioridade], dia, s.responsaveis.map(nomeP).join(", "), projetos.find((p) => p.id === s.projeto)?.nome].filter(Boolean);
    return partes.length ? `${partes.join(" · ")}${s.motivo ? ` — ${s.motivo}` : ""}` : "";
  };
  const pedir = async (outra: boolean) => {
    const t = titulo.trim();
    pedido.current = t;
    setPensando(true);
    const r = await sugerirTarefaAction(t, descricao, outra ? sug?.texto : undefined).catch(() => ({ sugestao: undefined }));
    if (pedido.current !== t) return; // the title changed meanwhile: a newer request wins
    setPensando(false);
    const texto = r.sugestao ? descrever(r.sugestao) : "";
    setSug(r.sugestao && texto ? { s: r.sugestao, texto } : null);
  };
  useEffect(() => {
    const t = titulo.trim();
    if (!pinu || editar || t.length < 12 || t === pedido.current) return;
    const h = setTimeout(() => pedir(false), 1500);
    return () => clearTimeout(h);
  }, [titulo]); // eslint-disable-line react-hooks/exhaustive-deps
  const usar = () => {
    if (!sug) return;
    const { s } = sug;
    if (s.equipe) setEquipe(s.equipe);
    if (s.prioridade) setPrio(s.prioridade);
    if (s.prazo) setPrazo(s.prazo);
    if (s.responsaveis.length) setSel(new Set(s.responsaveis));
    if (s.projeto) setProjeto(s.projeto);
    setSug(null);
  };
  const areas = equipes.find((e) => e.id === equipe)?.areas ?? [];
  const objs = objetivos.filter((o) => !projeto || !o.projeto || o.projeto === projeto);
  const grupos = useMemo(() => {
    const da = (p: Pessoa) => !!equipe && (p.equipes.includes(equipe) || p.coordena.includes(equipe));
    return (["equipe", "outras", "sem"] as const).map((g) => ({ g, ps: pessoas.filter((p) => (g === "equipe" ? da(p) : g === "outras" ? !da(p) && p.equipes.length > 0 : !p.equipes.length)) }));
  }, [equipe, pessoas]);
  const visivel = (p: Pessoa) => !busca || sn(p.nome).includes(sn(busca));
  const alternar = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const atalhos = [[l.hoje, iso(new Date())], [l.amanha, iso(mais(1))], [l.sexta, iso(proxDia(5, 0))], [l.proximaSemana, iso(proxDia(1))]];
  const rotulo = "rotulo-campo flex items-center gap-1.5 text-t2";

  return (
    <form action={editar ? updateTarefaAction : createTarefaAction} className="grid gap-6">
      <input type="hidden" name="back" value={back} />
      {editar && <input type="hidden" name="id" value={editar.id} />}
      {inicial.status && <input type="hidden" name="status" value={inicial.status} />}
      <div className="grid gap-3">
        <Campo tipo="titulo" name="title" required autoFocus={!editar} defaultValue={editar?.title} maxLength={200} rotulo={l.titulo} placeholder={l.tituloPh}
          onChange={(e) => setTitulo(e.target.value)}
          sugestao={pinu && !editar && (pensando || sug) ? <SugestaoPinu texto={sug?.texto ?? ""} carregando={pensando} onUsar={usar} onOutra={() => pedir(true)} /> : undefined} />
        {!editar && <Campo tipo="area" name="descricao" rows={2} maxLength={4000} rotulo={l.descricao} placeholder={l.descricaoPh} onChange={(e) => setDescricao(e.target.value)} />}
      </div>

      {editar && (
        <fieldset className="grid gap-2"><legend className={`${rotulo} mb-2`}><Icone nome="tarefa" tamanho={16} />{l.status}</legend>
          <div className="flex flex-wrap gap-2">
            {([["todo", l.aFazer, "prazo"], ["doing", l.fazendo, "enviar"], ["done", l.feito, "confirmar"]] as const).map(([v, nome, ic]) => (
              <label key={v} className={CHIP}>
                <input type="radio" name="status" value={v} defaultChecked={v === editar.status} className="sr-only" />
                <span className="grid size-6 place-items-center rounded-pilula bg-s1"><Icone nome={ic} tamanho={14} /></span>{nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="hidden">
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo tipo="selecao" name="equipe" rotulo={l.equipe} value={equipe} onChange={(e) => setEquipe(e.target.value)}>
          {podeSemEquipe && <option value="">{l.nenhum}</option>}
          {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </Campo>
        {areas.length > 0
          ? <Campo tipo="selecao" name="area" rotulo={l.area} defaultValue={editar && equipe === inicial.equipe ? editar.area : ""} key={equipe}><option value="">{l.nenhum}</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</Campo>
          : <div className="hidden sm:block" />}
      </div>

      <fieldset className="grid gap-2"><legend className={`${rotulo} mb-2`}><Icone nome="atencao" tamanho={16} />{l.prioridade}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(l.prio).map(([v, nome]) => (
            <label key={v} className={CHIP}>
              <input type="radio" name="prioridade" value={v} checked={prio === v} onChange={() => setPrio(v)} className="sr-only" />
              <span className="grid size-6 place-items-center rounded-pilula bg-s1"><Icone nome={PRIO_ICONE[v]} tamanho={14} className={PRIO_COR[v]} /></span>{nome}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Campo tipo="data" name="prazo" rotulo={l.prazo} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {atalhos.map(([nome, d]) => <Chip key={nome} icone="prazo" ativo={prazo === d} onClick={() => setPrazo(d)}>{nome}</Chip>)}
            {prazo && <Chip icone="fechar" onClick={() => setPrazo("")}>{l.semPrazo}</Chip>}
          </div>
        </div>
        <div className="grid content-start gap-1.5">
          <Campo tipo="selecao" name="recorrencia" rotulo={l.repetir} defaultValue={editar?.recorrencia ?? ""} aria-describedby="repete-aviso">
            <option value="">{l.naoRepete}</option><option value="semanal">{l.semanal}</option><option value="quinzenal">{l.quinzenal}</option><option value="mensal">{l.mensal}</option>
          </Campo>
          <p id="repete-aviso" className="meta px-4 text-t3">{l.repeteAviso}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo tipo="selecao" name="projeto" rotulo={l.projeto} value={projeto} onChange={(e) => setProjeto(e.target.value)}>
          <option value="">{l.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Campo>
        <Campo tipo="selecao" name="objetivo" rotulo={l.objetivo} defaultValue={inicial.objetivo} key={projeto}>
          <option value="">{l.nenhum}</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.ano} · {o.titulo}</option>)}
        </Campo>
      </div>

      <fieldset className="grid gap-3">
        <legend className={`${rotulo} mb-2`}>
          <Icone nome="pessoas" tamanho={16} />{l.responsaveis}{sel.size > 0 && <span className="rounded-pilula bg-s3 px-2 text-xs tabular-nums text-t1">{sel.size}</span>}
        </legend>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1"><Campo tipo="busca" rotulo={l.buscarPessoa} value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          {meId && !sel.has(meId) && <Botao type="button" variante="tonal" icone="mais" tamanho="G" onClick={() => alternar(meId)}>{l.eu}</Botao>}
        </div>
        <div className="grid max-h-80 gap-4 overflow-y-auto rounded-cartao bg-s1 p-4">
          {grupos.map(({ g, ps }) => {
            const vis = ps.filter(visivel);
            return (
              <div key={g} className={vis.length ? "grid gap-2" : "hidden"}>
                <p className="rotulo-maiusculo text-t3">{l.grupos[g]} <span className="tabular-nums">({ps.length})</span></p>
                <div className="flex flex-wrap gap-2">
                  {ps.map((p) => (
                    <label key={p.id} className={`${CHIP} ${visivel(p) ? "" : "hidden"}`} title={p.suspenso ? l.suspenso : undefined}>
                      <input type="checkbox" name="responsaveis" value={p.id} checked={sel.has(p.id)} onChange={() => alternar(p.id)} className="sr-only" />
                      <Avatar nome={p.nome} foto={p.foto} tamanho={24} />{p.nome.split(" (")[0]}
                      {p.suspenso && <Icone nome="cadeado" tamanho={14} aria-label={l.suspenso} className="text-t3" />}
                      {sel.has(p.id) && <Icone nome="confirmar" tamanho={14} className="text-ac-text" />}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {!grupos.some(({ ps }) => ps.some(visivel)) && <p className="corpo text-t3">{l.nenhumaPessoa}</p>}
        </div>
      </fieldset>

      {!editar && <details className="group">
        <summary className={`${rotulo} anel-foco alvo-toque min-h-9 cursor-pointer list-none rounded-pilula`}><Icone nome="tarefa" tamanho={16} />{l.checklist}<Icone nome="abrir" tamanho={16} className="transition-transform group-open:rotate-180" /></summary>
        <Campo tipo="area" name="checklist" rotulo={l.checklist} rows={4} maxLength={3000} placeholder={l.checklistPh} className="mt-2" />
      </details>}

      {/* one row of actions above the phone bar (DS 10.26) */}
      <div className="sticky bottom-[calc(7rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex items-center gap-2 bg-bg px-4 py-3 md:bottom-0 md:mx-0 md:px-0">
        <Enviar icone="confirmar" folha>{editar ? l.salvar : l.criar}</Enviar>
        {!editar && <Enviar icone="mais" variante="tonal" name="outra" value="1"><span className="sm:hidden">{l.outra}</span><span className="hidden sm:inline">{l.criarOutra}</span></Enviar>}
        <span className="ml-auto"><BotaoIcone icone="fechar" aria-label={l.cancelar} href={back} variante="fantasma" /></span>
      </div>
    </form>
  );
}
