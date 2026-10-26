import BotaoEnviar from "@/components/v2/BotaoEnviar";
import InterruptorAcao from "@/components/v2/InterruptorAcao";
import { ListaConfiguracoes } from "@/components/ds/Controles";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { getPessoas, meDaPessoa } from "@/lib/v2/data";
import { FUNCOES, funcaoLigada, lerFuncoes, type FuncaoId } from "@/lib/v2/funcoes";
import { funcoesAction } from "../acoes";
import { ToastAoAbrir } from "@/components/ds/Toast";
import type { ModuloProps } from "./index";

/** Switches: each feature on/off for everyone, or forced on/off for one person. */
export default function Funcoes({ q }: ModuloProps) {
  const c = lerFuncoes();
  const pessoas = getPessoas().filter((p) => !p.suspenso).sort((a, b) => a.name.localeCompare(b.name));
  const comAcesso = pessoas.map((p) => ({ p, me: meDaPessoa(p.id) })).filter((x) => x.me);
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;

  return (
    <div className="grid gap-5">
      <ToastAoAbrir texto={q.ok} />
      <p className="corpo text-t2">Cada função segue a regra normal (por exemplo, “só a Equipe 1”). Aqui dá para desligar uma função para todos, ou ligar/desligar só para uma pessoa — por exemplo, liberar o assistente para alguém testar antes de abrir para todos. Muda na próxima página que a pessoa abrir.</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {(Object.keys(FUNCOES) as FuncaoId[]).map((id) => {
          const f: (typeof FUNCOES)[FuncaoId] & { soGestao?: boolean } = FUNCOES[id], cf = c[id] ?? {};
          const com = comAcesso.filter((x) => funcaoLigada(id, x.me)).map((x) => x.p.name.split(" (")[0]);
          const excecoes = Object.entries(cf.pessoas ?? {});
          return (
            <section key={id} className="grid gap-3">
              {/* linha de configuração com interruptor: ligada para todos (regra normal) ou desligada para todos */}
              <ListaConfiguracoes>
                <InterruptorAcao acao={funcoesAction} campos={{ f: id }} valorLigado="ligar" valorDesligado="desligar" ligado={!cf.desligada}
                  rotulo={f.nome} descricao={`${f.descricao} Regra normal: ${f.regra}${f.soGestao ? " (nunca passa da Equipe 1)" : ""}.`} />
              </ListaConfiguracoes>
              <div className="grid gap-3 px-1">
                <p className="meta text-t2"><span className="text-t3">Tem agora ({com.length}):</span> {com.join(", ") || "ninguém"}</p>
                {excecoes.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {excecoes.map(([p, v]) => (
                      <li key={p}>
                        <form action={funcoesAction} className={`inline-flex h-9 items-center gap-1.5 rounded-pilula pl-3 pr-1 font-texto text-sm font-medium ${v ? "bg-ok-bg text-ok" : "bg-err-bg text-err"}`}>
                          <input type="hidden" name="f" value={id} /><input type="hidden" name="o" value="pessoa" /><input type="hidden" name="pessoa" value={p} /><input type="hidden" name="valor" value="padrao" />
                          <Icone nome={v ? "sucesso" : "erro"} tamanho={14} />{nome(p)}: {v ? "ligada" : "desligada"}
                          <button className="anel-foco grid size-7 place-items-center rounded-pilula hover:bg-s3" title="Voltar à regra normal" aria-label={`Voltar à regra normal: ${nome(p)}`}><Icone nome="fechar" tamanho={14} /></button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={funcoesAction} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                  <input type="hidden" name="f" value={id} /><input type="hidden" name="o" value="pessoa" />
                  <Campo tipo="selecao" name="pessoa" rotulo="Pessoa" required defaultValue="">
                    <option value="" disabled>Pessoa…</option>
                    {pessoas.map((p) => <option key={p.id} value={p.id}>{p.name.split(" (")[0]}</option>)}
                  </Campo>
                  <Campo tipo="selecao" name="valor" rotulo="Para ela" defaultValue="sim"><option value="sim">ligar</option><option value="nao">desligar</option><option value="padrao">regra normal</option></Campo>
                  <BotaoEnviar enviando="…" icone="confirmar">Aplicar</BotaoEnviar>
                </form>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
