import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import ConfirmarBotao from "./ConfirmarBotao";
import { alterarSenhaAction, sairTodosAction } from "@/app/(v2)/actions";
import { acessosRecentes, senhaAlteradaEm, temSenha } from "@/lib/v2/seguranca";
import type { Pessoa } from "@/lib/v2/data";
import type { Dict } from "@/lib/v2/i18n";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 grid gap-3";
const campo = "rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** "Segurança" tab — only on one's own profile: how to log in, password, sessions, recent logins. */
export default function Seguranca({ p, t, ok }: { p: Pessoa; t: Dict; ok?: string }) {
  const s = t.sg, tem = temSenha(p), alterada = senhaAlteradaEm(p.id);
  const acessos = acessosRecentes(p.id);
  return (
    <div className="grid gap-4">
      {ok && <p className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm"><ShieldCheck size={16} className="text-green-600" />{ok === "senha" ? s.okSenha : s.okSair}</p>}

      <div className={CARTAO}>
        <p className="font-medium flex items-center gap-2"><KeyRound size={16} />{tem ? s.trocarSenha : s.criarSenha}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{s.comoEntrar.replace("{usuario}", p.usuario || p.id).replace("{email}", p.email || "—")}</p>
        {alterada && <p className="text-xs text-neutral-500">{s.alteradaEm} {quando(alterada)}</p>}
        <form action={alterarSenhaAction} className="grid gap-2 sm:max-w-sm">
          {tem && <input name="atual" type="password" required autoComplete="current-password" placeholder={s.atual} className={campo} />}
          <input name="nova" type="password" required minLength={10} autoComplete="new-password" placeholder={s.nova} className={campo} />
          <input name="confirmar" type="password" required minLength={10} autoComplete="new-password" placeholder={s.confirmar} className={campo} />
          <BotaoEnviar enviando="…" className="justify-self-start rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">{tem ? s.salvarSenha : s.criarSenha}</BotaoEnviar>
          <p className="text-xs text-neutral-500">{s.regra}</p>
        </form>
      </div>

      <div className={CARTAO}>
        <p className="font-medium flex items-center gap-2"><LogOut size={16} />{s.sessoes}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{s.sessoesTexto}</p>
        <form action={sairTodosAction}>
          <ConfirmarBotao pergunta={s.sairPergunta} className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">{s.sairTodos}</ConfirmarBotao>
        </form>
        {acessos.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pt-1">{s.recentes}</p>
            <ul className="grid gap-1 text-sm">
              {acessos.slice(0, 8).map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-3"><span className="tabular-nums text-neutral-500">{quando(a.em)}</span><span>{s.metodo[a.metodo as keyof typeof s.metodo] ?? a.metodo}</span><span className="text-neutral-500">{a.disp}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
