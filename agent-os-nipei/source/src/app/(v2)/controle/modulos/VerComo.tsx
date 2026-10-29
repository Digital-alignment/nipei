import Link from "next/link";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import Campo from "@/components/ds/Campo";
import { BadgeEstado } from "@/components/ds/Chip";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { getEquipes, getPessoas, meDaPessoa, type Pessoa } from "@/lib/v2/data";
import { podeEntrar, temSenha } from "@/lib/v2/seguranca";
import { getConexoes } from "@/lib/v2/conexoes";
import { iniciarVerComoAction } from "../acoes";
import type { ModuloProps } from "./index";

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
      <div className="corpo grid gap-1 rounded-cartao bg-s1 p-4 text-t2">
        <p><strong className="text-t1">Ver como</strong> abre a plataforma exatamente como a pessoa vê (menu, permissões, Hoje, equipes), por 30 minutos.</p>
        <p className="meta text-t2">Somente leitura: nenhum formulário, botão ou API grava nada; não conta uso nem acesso para ela; o assistente, as Conexões e a Segurança dela ficam ocultos. Cada início e saída fica no Registro do painel.</p>
      </div>
      {q.erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{q.erro}</p>}
      <form className="max-w-md"><input type="hidden" name="m" value="vercomo" />
        <Campo tipo="busca" name="busca" rotulo="Buscar pessoa…" defaultValue={q.busca} />
      </form>
      <ul className="grid gap-2">
        {pessoas.map(({ p, d }) => (
          <li key={p.id} className="grid gap-2 rounded-cartao bg-s1 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid min-w-0 gap-1">
              <p className="flex flex-wrap items-center gap-2">
                <Link href={`/pessoas/${p.id}`} className="anel-foco titulo-cartao rounded-interno hover:underline">{p.name}</Link>
                {d.me ? <BadgeEstado estado="feita">entra</BadgeEstado> : <BadgeEstado estado="interna">não entra</BadgeEstado>}
              </p>
              <p className="meta text-t2">{d.bloqueio ? `Bloqueio: ${d.bloqueio}` : `Papel: ${d.papel}`}{d.equipes.length ? ` · ${d.equipes.join(", ")}` : ""}</p>
              <p className="meta text-t2">Como entra: {d.metodos.join(", ") || "nenhuma forma configurada"}{d.extras.length ? ` · ${d.extras.join(" · ")}` : ""}</p>
            </div>
            {d.me ? (
              <form action={iniciarVerComoAction} className="flex items-center gap-2">
                <input type="hidden" name="pessoa" value={p.id} />
                <select name="pagina" defaultValue="/hoje" aria-label="Página inicial" className={CAMPO_COMPACTO}>
                  {Object.entries(PAGINAS_VER_COMO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <BotaoEnviar enviando="…" icone="informacao" tamanho="P">Ver como</BotaoEnviar>
              </form>
            ) : <span className="meta text-t3">não dá para ver como (não entra)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
