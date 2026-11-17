import Chip from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import Tabela from "@/components/ds/padroes/Tabela";
import { EstadoVazio } from "@/components/ds/Estados";
import CopiarBotao from "@/components/v2/CopiarBotao";
import { getPessoas, meDaPessoa } from "@/lib/v2/data";
import { eventosDesde } from "@/lib/v2/eventos";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import { funcaoLigada } from "@/lib/v2/funcoes";
import { ehEscritaMcp } from "@/lib/v2/assistente";
import type { ModuloProps } from "./index";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia", day: "2-digit", month: "2-digit", year: "2-digit" });
const CONVITE = `Agora dá para usar o Nipëi de dentro do seu Claude, Gemini ou ChatGPT (no computador, no celular e por voz). Abra este link e siga o passo a passo do seu app: https://os.nipeihu.app/conectar`;

/** Who connected which AI app (MCP), how much they use it and what changed through it. Never the content. ?dias=7|30|90 */
export default function AppsIA({ q }: ModuloProps) {
  const dias = ["7", "30", "90"].includes(q.dias ?? "") ? Number(q.dias) : 30;
  const pessoas = getPessoas().filter((p) => !p.contato);
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const comAcesso = pessoas.filter((p) => { const me = meDaPessoa(p.id); return !!me && funcaoLigada("mcp", me); });
  const conexoes = pessoas.flatMap((p) => concessoesDe(p.id));
  const conectados = new Set(conexoes.map((g) => g.pessoa));

  // event detail = "<app>: <ferramenta>[ (erro)| (rascunho)]"
  const chamadas = eventosDesde(dias).filter((e) => e.canal === "mcp").map((e) => {
    const m = e.detalhe.match(/^(.*): (\S+)(?: \((erro|rascunho)\))?$/);
    return { pessoa: e.pessoa, app: m?.[1] ?? "", ferramenta: m?.[2] ?? e.detalhe, erro: m?.[3] === "erro", rascunho: m?.[3] === "rascunho" };
  });
  const mudou = (c: (typeof chamadas)[number]) => !c.erro && !c.rascunho && ehEscritaMcp(c.ferramenta);
  const rascunhos = chamadas.filter((c) => c.rascunho).length, confirmados = chamadas.filter((c) => c.ferramenta === "confirmar" && !c.erro).length;
  const porFerramenta = new Map<string, { n: number; mud: number }>();
  for (const c of chamadas) { const x = porFerramenta.get(c.ferramenta) ?? { n: 0, mud: 0 }; x.n++; if (mudou(c)) x.mud++; porFerramenta.set(c.ferramenta, x); }
  const faltam = comAcesso.filter((p) => !conectados.has(p.id)).map((p) => nome(p.id)).sort();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => <Chip key={d} href={`/controle?m=apps&dias=${d}`} ativo={d === dias} icone="calendario">{d} dias</Chip>)}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[["Pessoas conectadas", `${conectados.size} de ${comAcesso.length}`], ["Chamadas", String(chamadas.length)], ["Mudanças feitas", String(chamadas.filter(mudou).length)], ["Rascunhos confirmados", `${confirmados} de ${rascunhos}`]].map(([rot, v]) => (
          <Cartao key={rot} variante="kpi"><span className="meta text-t2">{rot}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{v}</span></Cartao>
        ))}
      </div>
      {!conexoes.length ? <EstadoVazio compacto selo="olho" titulo="Ninguém conectou um app de IA ainda." /> : (
        <Tabela rotulo="Conexões" ordemInicial={{ id: "u", desc: true }} colunas={[
          { id: "p", rotulo: "Pessoa", ordenavel: true }, { id: "a", rotulo: "App", ordenavel: true }, { id: "c", rotulo: "Conectado em", ordenavel: true },
          { id: "u", rotulo: "Último uso", ordenavel: true }, { id: "n", rotulo: "Chamadas", numero: true, ordenavel: true }, { id: "m", rotulo: "Mudanças", numero: true, ordenavel: true },
        ]} linhas={conexoes.map((g) => {
          const minhas = chamadas.filter((c) => c.pessoa === g.pessoa && c.app === g.nomeCliente);
          return { id: g.id, valores: { p: nome(g.pessoa), a: g.nomeCliente, c: g.criadoEm, u: g.usadoEm, n: minhas.length, m: minhas.filter(mudou).length },
            celulas: { p: nome(g.pessoa), a: g.nomeCliente, c: quando(g.criadoEm), u: quando(g.usadoEm), n: minhas.length, m: minhas.filter(mudou).length } };
        })} />
      )}
      {porFerramenta.size > 0 && (
        <Tabela rotulo="Ferramentas mais usadas" ordemInicial={{ id: "n", desc: true }} colunas={[
          { id: "f", rotulo: "Ferramenta", ordenavel: true }, { id: "n", rotulo: "Chamadas", numero: true, ordenavel: true }, { id: "m", rotulo: "Mudanças", numero: true, ordenavel: true },
        ]} linhas={[...porFerramenta].map(([f, x]) => ({ id: f, valores: { f, n: x.n, m: x.mud }, celulas: { f, n: x.n, m: x.mud } }))} />
      )}
      <section className="grid gap-2">
        <h3 className="titulo-secao">Ainda não conectaram</h3>
        <p className="meta text-t2">{faltam.length ? faltam.join(", ") : "Todos com acesso já conectaram um app."}</p>
      </section>
      <Cartao className="grid gap-3">
        <h3 className="titulo-secao">Convite</h3>
        <p className="corpo text-t2">{CONVITE}</p>
        <CopiarBotao texto={CONVITE} label="Copiar convite" copiado="Copiado" />
      </Cartao>
      <p className="meta text-t2">Contado a partir do registro de eventos: só o app e o nome da ferramenta, nunca o conteúdo. Rascunhos são separados desde a v2.114.</p>
    </div>
  );
}
