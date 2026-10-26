import BotaoEnviar from "@/components/v2/BotaoEnviar";
import InterruptorAcao from "@/components/v2/InterruptorAcao";
import { ListaConfiguracoes } from "@/components/ds/Controles";
import Botao from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import Aviso from "@/components/ds/Aviso";
import LinhaDoTempo from "@/components/ds/padroes/LinhaDoTempo";
import { getEquipes, getPessoas } from "@/lib/v2/data";
import { alertasEnviados, alertasLigados } from "@/lib/v2/alertas";
import { alertasAction, operacaoAction } from "../acoes";
import { ToastAoAbrir } from "@/components/ds/Toast";
import type { ModuloProps } from "./index";

const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" });

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
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <ToastAoAbrir texto={q.ok} />

      <section className="grid gap-3">
        <ListaConfiguracoes titulo="Alertas">
          <InterruptorAcao acao={alertasAction} valorLigado="ligar" valorDesligado="desligar" ligado={ligados} rotulo="Alertas no seu WhatsApp"
            descricao="A cada 10 minutos a Saúde é verificada; quando algo fica vermelho, ou volta ao normal, chega uma mensagem (sem repetir). Se o próprio WhatsApp do Nipëi cair, o aviso não sai — o painel continua mostrando." />
        </ListaConfiguracoes>
        <form action={alertasAction}><input type="hidden" name="o" value="teste" /><BotaoEnviar enviando="…" icone="enviar">Enviar alerta de teste</BotaoEnviar></form>
        {enviados.length > 0 && (
          <LinhaDoTempo itens={enviados.map((a) => ({ dia: dia(a.em), hora: hora(a.em), tipo: a.ok ? "estado" as const : "outro" as const, quem: a.ok ? "Alerta" : "Não enviado", texto: a.texto.split("\n").slice(2).join(" ").slice(0, 120) || a.texto.slice(0, 120) }))} />
        )}
      </section>

      <Cartao>
        <h2 className="titulo-cartao">Ações rápidas</h2>
        <div className="grid gap-2">
          <form action={operacaoAction}><input type="hidden" name="o" value="backup" /><BotaoEnviar enviando="Copiando…" icone="baixar">Cópia no Drive de todos agora</BotaoEnviar></form>
          <form action={operacaoAction}><input type="hidden" name="o" value="sync" /><BotaoEnviar enviando="…" icone="gerar-outra">Sincronizar o vault agora</BotaoEnviar></form>
          <form action={operacaoAction}><input type="hidden" name="o" value="bloqueios" /><BotaoEnviar enviando="…" icone="cadeado">Limpar bloqueios de login</BotaoEnviar></form>
          <div><Botao href="/controle?m=operacao&auditar=1" variante="tonal" tamanho="M" icone="atencao">Auditar equipes</Botao></div>
        </div>
      </Cartao>

      {audit && (
        <div className="lg:col-span-2">
          {audit.length
            ? <Aviso estado="atencao" titulo="Auditoria das equipes" mensagem={<ul className="grid gap-1">{audit.map((x, i) => <li key={i}>{x}</li>)}</ul>} />
            : <Aviso estado="sucesso" titulo="Auditoria das equipes" mensagem="Sem inconsistências: fichas e equipes batem." />}
        </div>
      )}
    </div>
  );
}
