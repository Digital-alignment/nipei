import { CalendarDays, CheckCircle2, FolderOpen, HardDriveUpload, Link2, Lock, Mail, Plug, Sparkles } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import ConfirmarBotao from "./ConfirmarBotao";
import { backupAgoraAction, desconectarGoogleAction, revogarAppAction } from "@/app/(v2)/actions";
import CopiarBotao from "./CopiarBotao";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import { getConexoes } from "@/lib/v2/conexoes";
import { googleConfigurado } from "@/lib/v2/google";
import type { Dict } from "@/lib/v2/i18n";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";
const sec = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm";
const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }) : "");

/** "Conexões" tab — only on the person's own profile: their Google account, what Nipëi may touch, backups. */
export default function Conexoes({ pessoaId, t, ok }: { pessoaId: string; t: Dict; ok?: boolean }) {
  const g = getConexoes(pessoaId).google;
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
          <li className="flex gap-2"><Lock size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.usoNunca}</li>
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

      <div className={`${CARTAO} grid gap-2 opacity-80`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5"><Plug size={13} />{c.emBreve}</p>
        <p className="text-sm flex gap-2"><Mail size={15} className="mt-0.5 shrink-0 text-neutral-500" />{c.breveGmail}</p>
      </div>
    </div>
  );
}
