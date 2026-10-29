import Icone from "@/components/ds/Icone";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import Botao from "@/components/ds/Botao";
import BotaoEnviar from "./BotaoEnviar";
import InterruptorAcao from "./InterruptorAcao";
import { ListaConfiguracoes } from "@/components/ds/Controles";
import { ToastAoAbrir } from "@/components/ds/Toast";
import ConfirmarBotao from "./ConfirmarBotao";
import { backupAgoraAction, chaveIAAction, desconectarGoogleAction, revogarAppAction, salvarChaveIAAction } from "@/app/(v2)/actions";
import { PROVEDORES } from "@/lib/v2/motorIA";
import CopiarBotao from "./CopiarBotao";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import { getConexoes } from "@/lib/v2/conexoes";
import { googleConfigurado, temGmail } from "@/lib/v2/google";
import type { Dict } from "@/lib/v2/i18n";

const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }) : "");

/** "Conexões" tab — only on the person's own profile: their Google account, what Nipëi may touch, backups. */
export default function Conexoes({ pessoaId, t, ok, gestao }: { pessoaId: string; t: Dict; ok?: boolean; gestao: boolean }) {
  const g = getConexoes(pessoaId).google;
  const ia = getConexoes(pessoaId).ia;
  const hoje = new Date().toISOString().slice(0, 10);
  const apps = concessoesDe(pessoaId);
  const c = t.cx;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-t2">{c.intro}</p>
      <ToastAoAbrir texto={ok ? c.conectadoOk : undefined} parametro="google" />

      <Cartao className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-interno bg-s2 flex items-center justify-center font-semibold">G</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Google</p>
            <p className="text-xs text-t2 truncate">{g ? `${c.conectadoComo} ${g.email}` : c.googleSub}</p>
          </div>
          {g && <span className="rounded-pilula bg-ok-bg text-ok px-2 py-0.5 text-xs">{c.conectado}</span>}
        </div>

        <ul className="grid gap-1.5 text-sm">
          <li className="flex gap-2"><Icone nome="calendario"  tamanho={15} className="mt-0.5 shrink-0 text-t2" />{c.usoCalendar}</li>
          <li className="flex gap-2"><Icone nome="baixar"  tamanho={15} className="mt-0.5 shrink-0 text-t2" />{c.usoDrive}</li>
          {temGmail(g)
            ? <li className="flex gap-2"><Icone nome="mensagem"  tamanho={15} className="mt-0.5 shrink-0 text-t2" />{c.usoGmail}</li>
            : <li className="flex gap-2"><Icone nome="cadeado"  tamanho={15} className="mt-0.5 shrink-0 text-t2" />{c.usoNunca}</li>}
        </ul>

        {!g && (googleConfigurado()
          ? <a href="/google/conectar" className="justify-self-start inline-flex items-center gap-1.5 anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]"><Icone nome="abrir-fora"  tamanho={15} />{c.conectar}</a>
          : <p className="text-xs text-warn">{c.naoConfigurado}</p>)}

        {g && (
          <>
            <div className="text-xs text-t2 grid gap-0.5">
              <span>{c.desde} {quando(g.conectadoEm)}</span>
              <span>{g.backup?.ultimoEm ? `${c.ultimoBackup} ${quando(g.backup.ultimoEm)}` : c.semBackup}</span>
              {g.backup?.erro && <span className="text-err">{c.erroBackup}: {g.backup.erro}</span>}
            </div>
            {gestao && !temGmail(g) && (
              <div className="rounded-interno border border-dashed p-3 grid gap-1.5">
                <p className="text-sm font-medium flex items-center gap-1.5"><Icone nome="mensagem"  tamanho={14} />{c.gmailTitulo}</p>
                <p className="text-xs text-t2">{c.gmailTexto}</p>
                <a href="/google/conectar?gmail=1" className="justify-self-start inline-flex items-center gap-1.5 anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4"><Icone nome="mensagem"  tamanho={14} />{c.gmailAtivar}</a>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={backupAgoraAction}><BotaoEnviar enviando="…" icone="baixar" variante="tonal">{c.backupAgora}</BotaoEnviar></form>
              {g.backup?.pastaId && <Botao href={`https://drive.google.com/drive/folders/${g.backup.pastaId}`} target="_blank" rel="noreferrer" icone="abrir-fora" variante="tonal" tamanho="M">{c.abrirPasta}</Botao>}
              <form action={desconectarGoogleAction} className="ml-auto">
                <ConfirmarBotao pergunta={c.desconectarPergunta} className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4">{c.desconectar}</ConfirmarBotao>
              </form>
            </div>
          </>
        )}
      </Cartao>

      <Cartao className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-interno bg-s2 flex items-center justify-center"><Icone nome="gerar-outra"  tamanho={17} /></span>
          <div className="flex-1 min-w-0"><p className="font-medium">{c.iaTitulo}</p><p className="text-xs text-t2">{c.iaSub}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-interno bg-s2 px-2.5 py-1.5 text-sm select-all">https://os.nipeihu.app/mcp</code>
          <CopiarBotao texto="https://os.nipeihu.app/mcp" label={c.copiarUrl} copiado={t.copiado} />
        </div>
        <ul className="grid gap-1 text-sm text-t2">
          <li><strong>Claude</strong>: {c.comoClaude}</li>
          <li><strong>Gemini</strong>: {c.comoGemini}</li>
          <li><strong>ChatGPT</strong>: {c.comoChatgpt}</li>
        </ul>
        <p className="text-xs text-t2">{c.iaAviso}</p>
        {apps.length > 0 && (
          <ul className="grid gap-2 border-t border-s2 pt-3">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{a.nomeCliente}</span>
                <span className="text-xs text-t2 flex-1">{c.desde} {quando(a.criadoEm)} · {c.usadoEm} {quando(a.usadoEm)}</span>
                <form action={revogarAppAction}><input type="hidden" name="id" value={a.id} />
                  <ConfirmarBotao pergunta={c.revogarPergunta.replace("{app}", a.nomeCliente)} className="anel-foco alvo-toque rounded-pilula bg-s3 px-3 py-1 font-texto text-xs font-semibold text-t1 hover:bg-s4">{c.revogar}</ConfirmarBotao>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {gestao && (
        <Cartao className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-interno bg-s2 flex items-center justify-center"><Icone nome="cadeado"  tamanho={17} /></span>
            <div className="flex-1 min-w-0"><p className="font-medium">{c.chaveTitulo}</p><p className="text-xs text-t2">{c.chaveSub}</p></div>
            {ia && <span className={`rounded-pilula px-2 py-0.5 text-xs ${ia.pausada ? "bg-s2 text-t2" : "bg-ok-bg text-ok"}`}>{ia.pausada ? c.chavePausada : c.chaveEmUso}</span>}
          </div>
          {ia ? (
            <>
              <p className="text-sm">{PROVEDORES[ia.provedor].nome} · <code className="text-xs">…{ia.key.slice(-4)}</code> · {ia.modelo}</p>
              <p className="text-xs text-t2">{c.chaveUsoHoje.replace("{n}", String(ia.uso?.dia === hoje ? ia.uso.n : 0))}{ia.erro && <span className="block text-warn">{c.chaveErro} {quando(ia.erroEm)}: {ia.erro}</span>}</p>
              <div className="flex flex-wrap gap-2">
                <div className="basis-full"><ListaConfiguracoes><InterruptorAcao acao={chaveIAAction} valorLigado="usar" valorDesligado="pausar" ligado={!ia.pausada} rotulo={c.chaveUsar} descricao={ia.pausada ? c.chavePausada : c.chaveEmUso} /></ListaConfiguracoes></div>
                <form action={chaveIAAction} className="ml-auto"><input type="hidden" name="o" value="remover" /><ConfirmarBotao pergunta={c.chaveRemoverPergunta} className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4">{c.chaveRemover}</ConfirmarBotao></form>
              </div>
            </>
          ) : <p className="text-sm text-t2">{c.chaveAgora}</p>}
          <details>
            <summary className="cursor-pointer text-sm font-medium">{ia ? c.chaveTrocar : c.chaveAdicionar}</summary>
            <form action={salvarChaveIAAction} className="grid gap-2 mt-3">
              <Campo tipo="selecao" rotulo={c.chaveProvedor} name="provedor" defaultValue={ia?.provedor ?? "gemini"}>
                {Object.entries(PROVEDORES).map(([id, p]) => <option key={id} value={id}>{p.nome}{id === "gemini" ? ` — ${c.chaveGratis}` : ""}</option>)}
              </Campo>
              <Campo tipo="senha" rotulo={c.chaveCampo} name="key" required autoComplete="off" />
              <Campo rotulo={c.chaveModelo} name="modelo" />
              <p className="text-xs text-t2">{c.chaveOnde} {Object.values(PROVEDORES).map((p, i) => <span key={p.nome}>{i ? " · " : ""}<a href={p.chave} target="_blank" rel="noreferrer" className="underline">{p.nome}</a></span>)}</p>
              <BotaoEnviar enviando={c.chaveTestando} icone="confirmar" variante="primario" tamanho="P" className="justify-self-start">{c.chaveSalvar}</BotaoEnviar>
              <p className="text-xs text-t2">{c.chaveAviso}</p>
            </form>
          </details>
        </Cartao>
      )}

    </div>
  );
}
