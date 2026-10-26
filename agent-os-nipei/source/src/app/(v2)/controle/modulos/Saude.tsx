import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import { checarTudo, type Estado } from "@/lib/v2/saude";
import { verificarSaudeAction } from "../acoes";
import type { ModuloProps } from "./index";

// estado = ícone + texto + cor (regra 10); sem dados = hachurado (pendente)
const VISUAL: Record<Estado, { cls: string; icone: NomeIcone; rotulo: string }> = {
  ok: { cls: "bg-ok-bg text-ok", icone: "sucesso", rotulo: "ok" },
  atencao: { cls: "bg-warn-bg text-warn", icone: "atencao", rotulo: "atenção" },
  erro: { cls: "bg-err-bg text-err", icone: "erro", rotulo: "erro" },
  sem_dados: { cls: "hachurado text-t2 shadow-[inset_0_0_0_1px_var(--s3)]", icone: "prazo", rotulo: "sem dados" },
};

/** Traffic lights for every service, grouped; cached for a minute, "Verificar agora" forces. */
export default async function Saude(_: ModuloProps) {
  const { em, dados } = await checarTudo();
  const grupos = [...new Set(dados.map((d) => d.grupo))];
  const conta = (e: Estado) => dados.filter((d) => d.estado === e).length;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["ok", "atencao", "erro", "sem_dados"] as Estado[]).map((e) => (
          <span key={e} className={`inline-flex h-9 items-center gap-1.5 rounded-pilula px-3.5 font-texto text-sm font-semibold ${VISUAL[e].cls}`}><Icone nome={VISUAL[e].icone} tamanho={16} />{conta(e)} {VISUAL[e].rotulo}</span>
        ))}
        <span className="meta ml-auto text-t2">verificado às {new Date(em).toLocaleTimeString("pt-BR", { timeZone: "America/Bahia" })}</span>
        <form action={verificarSaudeAction}><BotaoEnviar enviando="Verificando…" icone="gerar-outra" tamanho="P">Verificar agora</BotaoEnviar></form>
      </div>
      {grupos.map((g) => (
        <section key={g} className="grid gap-3">
          <h2 className="titulo-secao">{g}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {dados.filter((d) => d.grupo === g).map((d) => {
              const V = VISUAL[d.estado];
              return (
                <details key={d.id} className="group rounded-cartao bg-s1 p-3.5" open={d.estado === "erro"}>
                  <summary className="anel-foco flex cursor-pointer list-none items-start gap-3 rounded-interno">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-pilula ${V.cls}`}><Icone nome={V.icone} tamanho={18} aria-label={V.rotulo} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-texto text-[15px] font-semibold text-t1">{d.nome}</span><span className="meta block text-t2">{d.resumo}</span></span>
                    <span className="meta tabular-nums text-t3">{d.ms} ms</span>
                  </summary>
                  {d.detalhes.length > 0 && <ul className="meta mt-2 grid gap-0.5 pl-12 text-t2">{d.detalhes.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
