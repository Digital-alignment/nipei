import { CheckCircle2, CircleDashed, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { checarTudo, type Estado } from "@/lib/v2/saude";
import { verificarSaudeAction } from "../acoes";
import type { ModuloProps } from "./index";

const VISUAL: Record<Estado, { cor: string; Icone: typeof CheckCircle2; rotulo: string }> = {
  ok: { cor: "text-green-600", Icone: CheckCircle2, rotulo: "ok" },
  atencao: { cor: "text-amber-600", Icone: TriangleAlert, rotulo: "atenção" },
  erro: { cor: "text-red-600", Icone: XCircle, rotulo: "erro" },
  sem_dados: { cor: "text-neutral-400", Icone: CircleDashed, rotulo: "sem dados" },
};

/** Traffic lights for every service, grouped; cached for a minute, "Verificar agora" forces. */
export default async function Saude(_: ModuloProps) {
  const { em, dados } = await checarTudo();
  const grupos = [...new Set(dados.map((d) => d.grupo))];
  const conta = (e: Estado) => dados.filter((d) => d.estado === e).length;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {(["ok", "atencao", "erro", "sem_dados"] as Estado[]).map((e) => { const V = VISUAL[e]; return <span key={e} className={`inline-flex items-center gap-1 text-sm ${V.cor}`}><V.Icone size={15} />{conta(e)} {V.rotulo}</span>; })}
        <span className="text-xs text-neutral-500 ml-auto">verificado às {new Date(em).toLocaleTimeString("pt-BR", { timeZone: "America/Bahia" })}</span>
        <form action={verificarSaudeAction}><BotaoEnviar enviando="Verificando…" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><RefreshCw size={14} />Verificar agora</BotaoEnviar></form>
      </div>
      {grupos.map((g) => (
        <section key={g} className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{g}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {dados.filter((d) => d.grupo === g).map((d) => {
              const V = VISUAL[d.estado];
              return (
                <details key={d.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3" open={d.estado === "erro"}>
                  <summary className="list-none cursor-pointer flex items-start gap-2.5">
                    <V.Icone size={18} className={`${V.cor} mt-0.5 shrink-0`} />
                    <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{d.nome}</span><span className="block text-xs text-neutral-500">{d.resumo}</span></span>
                    <span className="text-[10px] text-neutral-400 tabular-nums">{d.ms} ms</span>
                  </summary>
                  {d.detalhes.length > 0 && <ul className="mt-2 pl-7 grid gap-0.5 text-xs text-neutral-600 dark:text-neutral-400">{d.detalhes.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
