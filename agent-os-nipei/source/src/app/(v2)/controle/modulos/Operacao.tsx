import { Bell, BellOff, HardDriveUpload, RefreshCw, ShieldOff, TriangleAlert } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { getEquipes, getPessoas } from "@/lib/v2/data";
import { alertasEnviados, alertasLigados } from "@/lib/v2/alertas";
import { alertasAction, operacaoAction } from "../acoes";
import { ToastAoAbrir } from "@/components/ds/Toast";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 grid gap-3";
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm";
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** Same rules as scripts/auditar-equipes.js: profile teams ↔ team members, coordination ↔ person. */
function auditarEquipes(): string[] {
  const ps = getPessoas(), es = getEquipes(), out: string[] = [];
  for (const e of es) {
    for (const m of e.membros) { const p = ps.find((x) => x.id === m); if (!p) out.push(`${e.nome}: membro "${m}" sem ficha`); else if (!p.equipes.includes(e.id)) out.push(`${e.nome}: ${p.name} está na equipe, mas a ficha não diz`); }
    for (const c of e.coordenadores) { const p = ps.find((x) => x.id === c); if (!p) out.push(`${e.nome}: coordenação "${c}" sem ficha`); else if (!p.coordena.includes(e.id)) out.push(`${e.nome}: ${p.name} coordena, mas a ficha não diz`); }
  }
  for (const p of ps) {
    for (const id of p.equipes) { const e = es.find((x) => x.id === id); if (!e) out.push(`${p.name}: equipe "${id}" não existe`); else if (!e.membros.includes(p.id)) out.push(`${p.name}: a ficha diz ${e.nome}, mas a equipe não o lista`); }
    if (p.externo && p.equipes.length) out.push(`${p.name}: marcado como externo, mas está em equipes`);
  }
  return out;
}

export default function Operacao({ q }: ModuloProps) {
  const ligados = alertasLigados(), enviados = alertasEnviados(10);
  const audit = q.auditar ? auditarEquipes() : null;
  return (
    <div className="grid gap-4 md:grid-cols-2 items-start">
      <ToastAoAbrir texto={q.ok} />

      <div className={CARTAO}>
        <p className="font-medium flex items-center gap-2">{ligados ? <Bell size={16} /> : <BellOff size={16} />}Alertas no seu WhatsApp</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">A cada 10 minutos a Saúde é verificada; quando algo fica vermelho, ou volta ao normal, chega uma mensagem (sem repetir). Se o próprio WhatsApp do Nipëi cair, o aviso não sai — o painel continua mostrando.</p>
        <div className="flex flex-wrap gap-2">
          <form action={alertasAction}><input type="hidden" name="o" value={ligados ? "desligar" : "ligar"} /><BotaoEnviar enviando="…" className={btn}>{ligados ? "Desligar alertas" : "Ligar alertas"}</BotaoEnviar></form>
          <form action={alertasAction}><input type="hidden" name="o" value="teste" /><BotaoEnviar enviando="…" className={btn}>Enviar alerta de teste</BotaoEnviar></form>
        </div>
        {enviados.length > 0 && <ul className="grid gap-1 text-xs text-neutral-500">{enviados.map((a, i) => <li key={i}>{quando(a.em)} · {a.ok ? "" : "(não enviado) "}{a.texto.split("\n").slice(2).join(" ").slice(0, 120) || a.texto.slice(0, 120)}</li>)}</ul>}
      </div>

      <div className={CARTAO}>
        <p className="font-medium">Ações rápidas</p>
        <form action={operacaoAction} className="flex items-center gap-2"><input type="hidden" name="o" value="backup" /><BotaoEnviar enviando="Copiando…" className={btn}><HardDriveUpload size={14} />Cópia no Drive de todos agora</BotaoEnviar></form>
        <form action={operacaoAction} className="flex items-center gap-2"><input type="hidden" name="o" value="sync" /><BotaoEnviar enviando="…" className={btn}><RefreshCw size={14} />Sincronizar o vault agora</BotaoEnviar></form>
        <form action={operacaoAction} className="flex items-center gap-2"><input type="hidden" name="o" value="bloqueios" /><BotaoEnviar enviando="…" className={btn}><ShieldOff size={14} />Limpar bloqueios de login</BotaoEnviar></form>
        <a href="/controle?m=operacao&auditar=1" className={`${btn} justify-self-start`}><TriangleAlert size={14} />Auditar equipes</a>
      </div>

      {audit && (
        <div className={`${CARTAO} md:col-span-2`}>
          <p className="font-medium">Auditoria das equipes</p>
          {audit.length ? <ul className="grid gap-1 text-sm text-amber-700 dark:text-amber-400">{audit.map((x, i) => <li key={i}>• {x}</li>)}</ul> : <p className="text-sm text-green-700 dark:text-green-400">Sem inconsistências: fichas e equipes batem.</p>}
        </div>
      )}
    </div>
  );
}
