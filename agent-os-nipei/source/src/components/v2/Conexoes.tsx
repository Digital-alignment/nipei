import { CalendarDays, CheckCircle2, FolderOpen, HardDriveUpload, Link2, Lock, Mail, Sparkles } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import ConfirmarBotao from "./ConfirmarBotao";
import { backupAgoraAction, chaveIAAction, desconectarGoogleAction, revogarAppAction, salvarChaveIAAction } from "@/app/(v2)/actions";
import { PROVEDORES } from "@/lib/v2/motorIA";
import { KeyRound } from "lucide-react";
import CopiarBotao from "./CopiarBotao";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import { getConexoes } from "@/lib/v2/conexoes";
import { googleConfigurado, temGmail } from "@/lib/v2/google";
import type { Dict } from "@/lib/v2/i18n";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";
const sec = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm";
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
      <p className="text-sm text-neutral-500">{c.intro}</p>
      {ok && <p className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm"><CheckCircle2 size={16} className="text-green-600" />{c.conectadoOk}</p>}

      <div className={`${CARTAO} grid gap-3`}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-semibold">G</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Google</p>
            <p className="text-xs text-neutral-500 truncate">{g ? `${c.conectadoComo} ${g.email}` : c.googleSub}</p>
          </div>
          {g && <span className="rounded-full bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 px-2 py-0.5 text-xs">{c.conectado}</span>}
        </div>

        <ul className="grid gap-1.5 text-sm">
          <li className="flex gap-2"><CalendarDays size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.usoCalendar}</li>
          <li className="flex gap-2"><HardDriveUpload size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.usoDrive}</li>
          {temGmail(g)
            ? <li className="flex gap-2"><Mail size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.usoGmail}</li>
            : <li className="flex gap-2"><Lock size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.usoNunca}</li>}
        </ul>

        {!g && (googleConfigurado()
          ? <a href="/google/conectar" className="justify-self-start inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium"><Link2 size={15} />{c.conectar}</a>
          : <p className="text-xs text-amber-700 dark:text-amber-400">{c.naoConfigurado}</p>)}

        {g && (
          <>
            <div className="text-xs text-neutral-500 grid gap-0.5">
              <span>{c.desde} {quando(g.conectadoEm)}</span>
              <span>{g.backup?.ultimoEm ? `${c.ultimoBackup} ${quando(g.backup.ultimoEm)}` : c.semBackup}</span>
              {g.backup?.erro && <span className="text-red-600 dark:text-red-400">{c.erroBackup}: {g.backup.erro}</span>}
            </div>
            {gestao && !temGmail(g) && (
              <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-3 grid gap-1.5">
                <p className="text-sm font-medium flex items-center gap-1.5"><Mail size={14} />{c.gmailTitulo}</p>
                <p className="text-xs text-neutral-500">{c.gmailTexto}</p>
                <a href="/google/conectar?gmail=1" className="justify-self-start inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><Mail size={14} />{c.gmailAtivar}</a>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={backupAgoraAction}><BotaoEnviar enviando="…" className={sec}><HardDriveUpload size={14} />{c.backupAgora}</BotaoEnviar></form>
              {g.backup?.pastaId && <a href={`https://drive.google.com/drive/folders/${g.backup.pastaId}`} target="_blank" rel="noreferrer" className={sec}><FolderOpen size={14} />{c.abrirPasta}</a>}
              <form action={desconectarGoogleAction} className="ml-auto">
                <ConfirmarBotao pergunta={c.desconectarPergunta} className="rounded-lg px-3 py-1.5 text-sm text-red-700 dark:text-red-400">{c.desconectar}</ConfirmarBotao>
              </form>
            </div>
          </>
        )}
      </div>

      <div className={`${CARTAO} grid gap-3`}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"><Sparkles size={17} /></span>
          <div className="flex-1 min-w-0"><p className="font-medium">{c.iaTitulo}</p><p className="text-xs text-neutral-500">{c.iaSub}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1.5 text-sm select-all">https://os.nipeihu.app/mcp</code>
          <CopiarBotao texto="https://os.nipeihu.app/mcp" label={c.copiarUrl} copiado={t.copiado} />
        </div>
        <ul className="grid gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          <li><strong>Claude</strong>: {c.comoClaude}</li>
          <li><strong>Gemini</strong>: {c.comoGemini}</li>
          <li><strong>ChatGPT</strong>: {c.comoChatgpt}</li>
        </ul>
        <p className="text-xs text-neutral-500">{c.iaAviso}</p>
        {apps.length > 0 && (
          <ul className="grid gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{a.nomeCliente}</span>
                <span className="text-xs text-neutral-500 flex-1">{c.desde} {quando(a.criadoEm)} · {c.usadoEm} {quando(a.usadoEm)}</span>
                <form action={revogarAppAction}><input type="hidden" name="id" value={a.id} />
                  <ConfirmarBotao pergunta={c.revogarPergunta.replace("{app}", a.nomeCliente)} className="rounded-lg px-2.5 py-1 text-xs text-red-700 dark:text-red-400">{c.revogar}</ConfirmarBotao>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {gestao && (
        <div className={`${CARTAO} grid gap-3`}>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"><KeyRound size={17} /></span>
            <div className="flex-1 min-w-0"><p className="font-medium">{c.chaveTitulo}</p><p className="text-xs text-neutral-500">{c.chaveSub}</p></div>
            {ia && <span className={`rounded-full px-2 py-0.5 text-xs ${ia.pausada ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600" : "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300"}`}>{ia.pausada ? c.chavePausada : c.chaveEmUso}</span>}
          </div>
          {ia ? (
            <>
              <p className="text-sm">{PROVEDORES[ia.provedor].nome} · <code className="text-xs">…{ia.key.slice(-4)}</code> · {ia.modelo}</p>
              <p className="text-xs text-neutral-500">{c.chaveUsoHoje.replace("{n}", String(ia.uso?.dia === hoje ? ia.uso.n : 0))}{ia.erro && <span className="block text-amber-700 dark:text-amber-400">{c.chaveErro} {quando(ia.erroEm)}: {ia.erro}</span>}</p>
              <div className="flex flex-wrap gap-2">
                <form action={chaveIAAction}><input type="hidden" name="o" value={ia.pausada ? "usar" : "pausar"} /><BotaoEnviar enviando="…" className={sec}>{ia.pausada ? c.chaveUsar : c.chavePausar}</BotaoEnviar></form>
                <form action={chaveIAAction} className="ml-auto"><input type="hidden" name="o" value="remover" /><ConfirmarBotao pergunta={c.chaveRemoverPergunta} className="rounded-lg px-3 py-1.5 text-sm text-red-700 dark:text-red-400">{c.chaveRemover}</ConfirmarBotao></form>
              </div>
            </>
          ) : <p className="text-sm text-neutral-600 dark:text-neutral-300">{c.chaveAgora}</p>}
          <details>
            <summary className="cursor-pointer text-sm font-medium">{ia ? c.chaveTrocar : c.chaveAdicionar}</summary>
            <form action={salvarChaveIAAction} className="grid gap-2 mt-3">
              <select name="provedor" defaultValue={ia?.provedor ?? "gemini"} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
                {Object.entries(PROVEDORES).map(([id, p]) => <option key={id} value={id}>{p.nome}{id === "gemini" ? ` — ${c.chaveGratis}` : ""}</option>)}
              </select>
              <input name="key" type="password" required autoComplete="off" placeholder={c.chaveCampo} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
              <input name="modelo" placeholder={c.chaveModelo} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
              <p className="text-xs text-neutral-500">{c.chaveOnde} {Object.values(PROVEDORES).map((p, i) => <span key={p.nome}>{i ? " · " : ""}<a href={p.chave} target="_blank" rel="noreferrer" className="underline">{p.nome}</a></span>)}</p>
              <BotaoEnviar enviando={c.chaveTestando} className="justify-self-start rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">{c.chaveSalvar}</BotaoEnviar>
              <p className="text-xs text-neutral-500">{c.chaveAviso}</p>
            </form>
          </details>
        </div>
      )}

    </div>
  );
}
