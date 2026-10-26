import { getAcessos, getPessoas } from "@/lib/v2/data";
import { todosAcessos } from "@/lib/v2/seguranca";
import { getConexoes } from "@/lib/v2/conexoes";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import Chip from "@/components/ds/Chip";
import Tabela from "@/components/ds/padroes/Tabela";
import { EstadoVazio } from "@/components/ds/Estados";
import type { ModuloProps } from "./index";

const METODO: Record<string, string> = { senha: "senha", google: "Google", link: "link WhatsApp" };
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** Who logged in, when and how; plus each person's last use and connections. Filters: ?pessoa= &metodo= */
export default function Acessos({ q }: ModuloProps) {
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const todos = todosAcessos(), usos = getAcessos();
  const desde30 = Date.now() - 30 * 86_400_000;
  // everyone who logged in or used the platform at least once
  const ids = [...new Set([...todos.map((a) => a.pessoa), ...Object.keys(usos)])];
  const linhas = ids.map((id) => {
    const meus = todos.filter((a) => a.pessoa === id), c = getConexoes(id);
    return { id, ultimo: meus[0], logins30: meus.filter((a) => Date.parse(a.em) > desde30).length, uso: usos[id] ?? "", google: !!c.google, apps: concessoesDe(id).map((g) => g.nomeCliente) };
  });
  const lista = todos.filter((a) => (!q.pessoa || a.pessoa === q.pessoa) && (!q.metodo || a.metodo === q.metodo)).slice(0, 100);
  const filtro = (k: string, v?: string) => { const s = new URLSearchParams({ m: "acessos", ...(q.pessoa ? { pessoa: q.pessoa } : {}), ...(q.metodo ? { metodo: q.metodo } : {}) }); if (v) s.set(k, v); else s.delete(k); return `/controle?${s}`; };

  return (
    <div className="grid gap-6">
      <Tabela rotulo="Acessos por pessoa" ordemInicial={{ id: "uso", desc: true }} colunas={[
        { id: "pessoa", rotulo: "Pessoa", ordenavel: true }, { id: "uso", rotulo: "Último uso", ordenavel: true }, { id: "login", rotulo: "Último login", ordenavel: true },
        { id: "logins", rotulo: "Logins 30d", numero: true, ordenavel: true }, { id: "conexoes", rotulo: "Conexões" },
      ]} linhas={linhas.map((l) => ({
        id: l.id, href: filtro("pessoa", l.id),
        valores: { pessoa: nome(l.id), uso: l.uso, login: l.ultimo?.em ?? "", logins: l.logins30 },
        celulas: {
          pessoa: nome(l.id), uso: l.uso ? l.uso.split("-").reverse().join("/") : "—",
          login: l.ultimo ? `${quando(l.ultimo.em)} · ${METODO[l.ultimo.metodo] ?? l.ultimo.metodo}` : <span className="text-t3">antes do registro</span>,
          logins: l.logins30, conexoes: [l.google && "Google", ...l.apps].filter(Boolean).join(" · ") || "—",
        },
      }))} />

      <section className="grid gap-3">
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <span className="rotulo-maiusculo shrink-0 text-t3">Logins</span>
          <Chip href={filtro("metodo")} ativo={!q.metodo}>todos</Chip>
          {Object.entries(METODO).map(([k, v]) => <Chip key={k} href={filtro("metodo", k)} ativo={q.metodo === k}>{v}</Chip>)}
          {q.pessoa && <Chip href={filtro("pessoa")} icone="fechar">{nome(q.pessoa)}</Chip>}
        </div>
        <Tabela rotulo="Logins" vazio={<EstadoVazio compacto selo="olho" titulo="Nenhum login registrado (o registro começou na v2.51)." />} colunas={[
          { id: "quando", rotulo: "Quando" }, { id: "pessoa", rotulo: "Pessoa" }, { id: "metodo", rotulo: "Como" }, { id: "disp", rotulo: "Aparelho" },
        ]} linhas={lista.map((a, i) => ({ id: String(i), celulas: { quando: <span className="tabular-nums">{quando(a.em)}</span>, pessoa: nome(a.pessoa), metodo: METODO[a.metodo] ?? a.metodo, disp: a.disp } }))} />
      </section>
    </div>
  );
}
