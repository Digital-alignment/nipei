import { CheckCircle2 } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { getPessoas, meDaPessoa } from "@/lib/v2/data";
import { FUNCOES, funcaoLigada, lerFuncoes, type FuncaoId } from "@/lib/v2/funcoes";
import { funcoesAction } from "../acoes";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 grid gap-3";
const btn = "rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm";
const campo = "rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-sm";

/** Switches: each feature on/off for everyone, or forced on/off for one person. */
export default function Funcoes({ q }: ModuloProps) {
  const c = lerFuncoes();
  const pessoas = getPessoas().filter((p) => !p.suspenso).sort((a, b) => a.name.localeCompare(b.name));
  const comAcesso = pessoas.map((p) => ({ p, me: meDaPessoa(p.id) })).filter((x) => x.me);
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;

  return (
    <div className="grid gap-4">
      {q.ok && <p className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm"><CheckCircle2 size={16} className="text-green-600" />{q.ok}</p>}
      <p className="text-sm text-neutral-500">Cada função segue a regra normal (por exemplo, “só a Equipe 1”). Aqui dá para desligar uma função para todos, ou ligar/desligar só para uma pessoa — por exemplo, liberar o assistente para alguém testar antes de abrir para todos. Muda na próxima página que a pessoa abrir.</p>
      <div className="grid gap-4 md:grid-cols-2 items-start">
        {(Object.keys(FUNCOES) as FuncaoId[]).map((id) => {
          const f: (typeof FUNCOES)[FuncaoId] & { soGestao?: boolean } = FUNCOES[id], cf = c[id] ?? {};
          const com = comAcesso.filter((x) => funcaoLigada(id, x.me)).map((x) => x.p.name.split(" (")[0]);
          const excecoes = Object.entries(cf.pessoas ?? {});
          return (
            <div key={id} className={`${CARTAO} ${cf.desligada ? "opacity-80" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{f.nome} {cf.desligada && <span className="ml-1 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">desligada</span>}</p>
                  <p className="text-xs text-neutral-500">{f.descricao} Regra normal: {f.regra}{f.soGestao ? " (nunca passa da Equipe 1)" : ""}.</p>
                </div>
                <form action={funcoesAction}><input type="hidden" name="f" value={id} /><input type="hidden" name="o" value={cf.desligada ? "ligar" : "desligar"} /><BotaoEnviar enviando="…" className={`${btn} shrink-0`}>{cf.desligada ? "Ligar" : "Desligar para todos"}</BotaoEnviar></form>
              </div>
              <p className="text-xs"><span className="text-neutral-500">Tem agora ({com.length}):</span> {com.join(", ") || "ninguém"}</p>
              {excecoes.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {excecoes.map(([p, v]) => (
                    <li key={p}>
                      <form action={funcoesAction} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${v ? "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400" : "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"}`}>
                        <input type="hidden" name="f" value={id} /><input type="hidden" name="o" value="pessoa" /><input type="hidden" name="pessoa" value={p} /><input type="hidden" name="valor" value="padrao" />
                        {nome(p)}: {v ? "ligada" : "desligada"}<button className="ml-0.5" title="Voltar à regra normal" aria-label="Voltar à regra normal">✕</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={funcoesAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="f" value={id} /><input type="hidden" name="o" value="pessoa" />
                <select name="pessoa" required className={`${campo} min-w-0 flex-1`} defaultValue="">
                  <option value="" disabled>Pessoa…</option>
                  {pessoas.map((p) => <option key={p.id} value={p.id}>{p.name.split(" (")[0]}</option>)}
                </select>
                <select name="valor" className={campo} defaultValue="sim"><option value="sim">ligar</option><option value="nao">desligar</option><option value="padrao">regra normal</option></select>
                <BotaoEnviar enviando="…" className={btn}>Aplicar</BotaoEnviar>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
