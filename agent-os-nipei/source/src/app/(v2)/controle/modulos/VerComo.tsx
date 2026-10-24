import Link from "next/link";
import { Eye } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { getEquipes, getPessoas, meDaPessoa, type Pessoa } from "@/lib/v2/data";
import { podeEntrar, temSenha } from "@/lib/v2/seguranca";
import { getConexoes } from "@/lib/v2/conexoes";
import { iniciarVerComoAction } from "../acoes";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";
export const PAGINAS_VER_COMO: Record<string, string> = { "/hoje": "Hoje", "/agenda": "Agenda", "/equipes": "Equipes", "/projetos": "Projetos", "/conhecimento": "Conhecimento", ficha: "Ficha da pessoa" };

/** Why a person can or can't get in, how, and what they'd see — the support view behind "ver como". */
function diagnostico(p: Pessoa) {
  const equipes = getEquipes(), me = meDaPessoa(p.id), g = getConexoes(p.id).google;
  const comAcesso = p.equipes.filter((id) => { const e = equipes.find((x) => x.id === id); return e?.acesso || e?.gestao; });
  const bloqueio = p.externo ? "contato externo (fora das equipes)" : p.suspenso ? "acesso suspenso" : !p.equipes.length ? "não está em nenhuma equipe" : !comAcesso.length ? "nenhuma equipe dele tem acesso à plataforma" : !podeEntrar(p) ? "sem acesso" : "";
  const metodos = [temSenha(p) && "senha", (p.email || g) && "Google", p.whatsapp && p.whatsappVerificado && "link no WhatsApp"].filter(Boolean) as string[];
  return {
    me, bloqueio, metodos,
    papel: me?.gestao ? "gestão (vê tudo)" : me?.coordena.length ? `coordena ${me.coordena.map((id) => equipes.find((e) => e.id === id)?.nome ?? id).join(", ")}` : me ? "membro" : "—",
    equipes: p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return `${e?.nome ?? id}${e && !(e.acesso || e.gestao) ? " (sem acesso)" : ""}`; }),
    extras: [me?.gestao && "assistente", p.avisosWhatsapp && p.whatsapp ? "avisos no WhatsApp" : null, g && "Google conectado"].filter(Boolean) as string[],
  };
}

export default function VerComo({ q }: ModuloProps) {
  const busca = (q.busca ?? "").toLowerCase();
  const pessoas = getPessoas().filter((p) => !busca || p.name.toLowerCase().includes(busca) || p.id.includes(busca))
    .map((p) => ({ p, d: diagnostico(p) }))
    .sort((a, b) => Number(!!b.d.me) - Number(!!a.d.me) || a.p.name.localeCompare(b.p.name, "pt"));
  return (
    <div className="grid gap-4">
      <div className={`${CARTAO} p-4 text-sm text-neutral-600 dark:text-neutral-300 grid gap-1`}>
        <p><strong>Ver como</strong> abre a plataforma exatamente como a pessoa vê (menu, permissões, Hoje, equipes), por 30 minutos.</p>
        <p className="text-xs text-neutral-500">Somente leitura: nenhum formulário, botão ou API grava nada; não conta uso nem acesso para ela; o assistente, as Conexões e a Segurança dela ficam ocultos. Cada início e saída fica no Registro do painel.</p>
      </div>
      {q.erro && <p className="text-sm text-red-600 dark:text-red-400">{q.erro}</p>}
      <form className="flex gap-2"><input type="hidden" name="m" value="vercomo" />
        <input name="busca" defaultValue={q.busca} placeholder="Buscar pessoa…" className="flex-1 sm:flex-none sm:w-72 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm" />
        <button className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">Buscar</button>
      </form>
      <ul className="grid gap-2">
        {pessoas.map(({ p, d }) => (
          <li key={p.id} className={`${CARTAO} p-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center`}>
            <div className="min-w-0 grid gap-0.5">
              <p className="text-sm"><Link href={`/pessoas/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${d.me ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}>{d.me ? "entra" : "não entra"}</span></p>
              <p className="text-xs text-neutral-500">{d.bloqueio ? `Bloqueio: ${d.bloqueio}` : `Papel: ${d.papel}`}{d.equipes.length ? ` · ${d.equipes.join(", ")}` : ""}</p>
              <p className="text-xs text-neutral-500">Como entra: {d.metodos.join(", ") || "nenhuma forma configurada"}{d.extras.length ? ` · ${d.extras.join(" · ")}` : ""}</p>
            </div>
            {d.me ? (
              <form action={iniciarVerComoAction} className="flex items-center gap-1.5">
                <input type="hidden" name="pessoa" value={p.id} />
                <select name="pagina" defaultValue="/hoje" className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-xs">
                  {Object.entries(PAGINAS_VER_COMO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <BotaoEnviar enviando="…" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 text-black px-3 py-1.5 text-sm font-medium"><Eye size={14} />Ver como</BotaoEnviar>
              </form>
            ) : <span className="text-xs text-neutral-400">não dá para ver como (não entra)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
