import Icone from "@/components/ds/Icone";
import BotaoEnviar from "./BotaoEnviar";
import { ToastAoAbrir } from "@/components/ds/Toast";
import ConfirmarBotao from "./ConfirmarBotao";
import { alterarSenhaAction, sairTodosAction } from "@/app/(v2)/actions";
import { acessosRecentes, senhaAlteradaEm, temSenha } from "@/lib/v2/seguranca";
import type { Pessoa } from "@/lib/v2/data";
import type { Dict } from "@/lib/v2/i18n";

const CARTAO = "rounded-cartao bg-s1 p-4 grid gap-3";
const campo = "rounded-interno bg-s2 px-3 py-2 text-sm";
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** "Segurança" tab — only on one's own profile: how to log in, password, sessions, recent logins. */
export default function Seguranca({ p, t, ok }: { p: Pessoa; t: Dict; ok?: string }) {
  const s = t.sg, tem = temSenha(p), alterada = senhaAlteradaEm(p.id);
  const acessos = acessosRecentes(p.id);
  return (
    <div className="grid gap-4">
      <ToastAoAbrir texto={ok ? (ok === "senha" ? s.okSenha : s.okSair) : undefined} />

      <div className={CARTAO}>
        <p className="font-medium flex items-center gap-2"><Icone nome="cadeado"  tamanho={16} />{tem ? s.trocarSenha : s.criarSenha}</p>
        <p className="text-sm text-t2">{s.comoEntrar.replace("{usuario}", p.usuario || p.id).replace("{email}", p.email || "—")}</p>
        {alterada && <p className="text-xs text-t2">{s.alteradaEm} {quando(alterada)}</p>}
        <form action={alterarSenhaAction} className="grid gap-2 sm:max-w-sm">
          {tem && <input name="atual" type="password" required autoComplete="current-password" placeholder={s.atual} className={campo} />}
          <input name="nova" type="password" required minLength={10} autoComplete="new-password" placeholder={s.nova} className={campo} />
          <input name="confirmar" type="password" required minLength={10} autoComplete="new-password" placeholder={s.confirmar} className={campo} />
          <BotaoEnviar enviando="…" className="justify-self-start anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{tem ? s.salvarSenha : s.criarSenha}</BotaoEnviar>
          <p className="text-xs text-t2">{s.regra}</p>
        </form>
      </div>

      <div className={CARTAO}>
        <p className="font-medium flex items-center gap-2"><Icone nome="voltar"  tamanho={16} />{s.sessoes}</p>
        <p className="text-sm text-t2">{s.sessoesTexto}</p>
        <form action={sairTodosAction}>
          <ConfirmarBotao pergunta={s.sairPergunta} className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4">{s.sairTodos}</ConfirmarBotao>
        </form>
        {acessos.length > 0 && (
          <>
            <p className="rotulo-maiusculo text-t3 pt-1">{s.recentes}</p>
            <ul className="grid gap-1 text-sm">
              {acessos.slice(0, 8).map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-3"><span className="tabular-nums text-t2">{quando(a.em)}</span><span>{s.metodo[a.metodo as keyof typeof s.metodo] ?? a.metodo}</span><span className="text-t2">{a.disp}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
