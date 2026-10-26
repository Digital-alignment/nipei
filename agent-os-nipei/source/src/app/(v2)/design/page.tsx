import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Icone from "@/components/ds/Icone";
import Botao, { BotaoDividido, BotaoIcone } from "@/components/ds/Botao";
import { Bloco, MolduraBlocos } from "@/components/ds/Bloco";
import { DemoAbas, DemoAvisos, DemoCampo, DemoCarregando, DemoChips, DemoControles, DemoEtapas, DemoRecolhivel, DemoSegmentado } from "./Demos";
import Chip, { BadgeEstado, Contagem } from "@/components/ds/Chip";
import Avatar, { GrupoAvatares, LinhaPessoa } from "@/components/ds/Avatar";
import Cartao, { CabecalhoCartao, GradeBento, NumeroKpi } from "@/components/ds/Cartao";
import { BadgeEstado as Estado } from "@/components/ds/Chip";
import Selo, { SELOS, type NomeSelo } from "@/components/ds/Selo";
import TemaLocal, { ValorToken } from "@/components/ds/TemaLocal";
import { ICONES, type NomeIcone } from "@/components/ds/icones.generated";
import { SIMBOLOS, type ArquivoSimbolo } from "@/components/ds/simbolos.generated";
import { currentUser } from "@/lib/v2/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design · Nipëi", robots: { index: false, follow: false } };

// Referência visual viva do design system (docs/design-system/DESIGN-SYSTEM.md). Só gestão:
// o proxy já manda os outros perfis para /hoje e a página responde 404 a quem não é gestão.
// Tudo aqui usa só tokens e as classes de tipografia; cada componente novo ganha a sua seção.

const CORES: { titulo: string; tokens: [string, string][] }[] = [
  { titulo: "Escala neutra", tokens: [["bg", "fundo"], ["s1", "superfície 1 · cartões"], ["s2", "superfície 2 · campos, itens"], ["s3", "superfície 3 · tonal, selecionado"], ["s4", "linha forte · contorno de estado"], ["t3", "texto terciário · ícone inativo"], ["t2", "texto secundário"], ["t1", "texto principal"]] },
  { titulo: "Acento", tokens: [["ac", "ação / acento"], ["ac-press", "pressionado"], ["ac-ink", "texto sobre o acento"], ["ac-text", "texto/ícone em acento"], ["ac-soft", "fundo tingido"], ["ac-apoio", "apoio gráfico (nunca texto)"], ["destaque-bg", "destaque de conteúdo"], ["destaque-ink", "texto do destaque"]] },
];
const ESTADOS = [["ok", "Sucesso", "Tarefa concluída", "sucesso"], ["warn", "Atenção", "Prazo amanhã", "atencao"], ["err", "Erro", "Não foi possível salvar", "erro"], ["info", "Informação", "3 fotos processando", "informacao"]] as const;
const EQUIPES = [["eq-escritorio", "Escritório / Gestão Geral", "escritorio"], ["eq-producao", "Produção Yawanawa", "producao"], ["eq-guardioes", "Guardiões", "guardioes"], ["eq-manutencao", "Manutenção e Logística", "manutencao"], ["eq-reserva", "(reserva)", null]] as const;
const TIPOS: [string, string, string][] = [
  ["titulo-pagina", "Outfit 700 · 40 / 60", "Tarefas"],
  ["saudacao", "Outfit 300 · 30 / 40", "Oi, Ashuan. Como posso ajudar?"],
  ["numero-display", "Outfit 200 · 48 / 58 · tabular", "27,4h"],
  ["titulo-secao", "Outfit 600 · 19 / 20", "Atrasadas"],
  ["titulo-cartao", "Outfit 600 · 17", "Revisar fatos do Conhecimento"],
  ["corpo", "Google Sans 400 · 15 / 14", "A IA separa em fatos curtos e a gestão confirma o que está certo."],
  ["botao-texto", "Google Sans 600 · 16 / 15", "Nova tarefa"],
  ["rotulo-campo", "Google Sans 500 · 12", "Título da tarefa"],
  ["meta", "Google Sans 500 · 13 / 12,5 · tabular", "Prazo 28 out · 14:30 · Guardiões"],
  ["rotulo-maiusculo", "Outfit 500 · 12 / 11 · +0,08em", "Principal"],
];
const RAIOS = [["rounded-pilula", "pílula · 999"], ["rounded-moldura", "moldura · 28"], ["rounded-bloco", "bloco · 20"], ["rounded-cartao", "cartão · 16 / 12"], ["rounded-interno", "interno · 12"]] as const;
const ESPACO = [["w-1", 4], ["w-2", 8], ["w-3", 12], ["w-4", 16], ["w-5", 20], ["w-6", 24], ["w-8", 32], ["w-10", 40], ["w-14", 56]] as const;
const COMPONENTES = [["botao", "Botão"], ["blocos", "Blocos"], ["etapas", "Etapas"], ["segmentado", "Segmentado"], ["campo", "Campo"], ["chip", "Chip"], ["badge", "Badge"], ["avatar", "Avatar"], ["cartao", "Cartão"], ["aviso", "Aviso"], ["abas", "Abas"], ["recolhivel", "Recolhível"], ["controles", "Interruptor e configurações"], ["progresso", "Progresso"], ["vazio", "Vazio"], ["skeleton", "Skeleton"], ["menu", "Menu"], ["pinu", "Pinu"], ["padroes", "Padrões"]] as const;
const SECOES = [["cores", "Cores"], ["tipografia", "Tipografia"], ["forma", "Raios e espaço"], ["icones", "Ícones"], ...COMPONENTES] as const;

const Rotulo = ({ children }: { children: ReactNode }) => <p className="rotulo-maiusculo text-t2 w-full">{children}</p>;
const Linha = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

/** Componentes já implementados: o conteúdo da seção na /design. */
const PRONTOS: Record<string, { sub: string; conteudo: ReactNode }> = {
  botao: {
    sub: "Sempre com ícone. G 56 (padrão) · M 48 · P 40 (só computador). Remover fora do diálogo é tonal; o vermelho só existe dentro do diálogo.",
    conteudo: (
      <div className="grid gap-5">
        <Linha><Rotulo>Variantes</Rotulo>
          <Botao icone="mais">Primário</Botao>
          <Botao icone="editar" variante="tonal">Tonal</Botao>
          <Botao icone="fechar" variante="fantasma">Fantasma</Botao>
          <Botao icone="lixeira" variante="destrutivo">Remover (só no diálogo)</Botao>
          <Botao icone="mais" desativado>Desativado</Botao>
        </Linha>
        <Linha><Rotulo>Tamanhos</Rotulo>
          <Botao icone="mais" tamanho="G">Grande 56</Botao>
          <Botao icone="mais" tamanho="M">Médio 48</Botao>
          <Botao icone="mais" tamanho="P">Pequeno 40</Botao>
        </Linha>
        <Linha><Rotulo>Folha (a ação principal da tela) · ícone à direita · carregando</Rotulo>
          <Botao icone="mais" folha>Nova tarefa</Botao>
          <Botao icone="tarefa" variante="fantasma" iconeDireita="avancar">Ver tudo</Botao>
          <Botao icone="confirmar" carregando>Salvar</Botao>
          <DemoCarregando />
        </Linha>
        <Linha><Rotulo>Só ícone (tooltip ao passar o mouse ou com Tab) · 52 / 44 / 40</Rotulo>
          <BotaoIcone icone="buscar" aria-label="Buscar" />
          <BotaoIcone icone="filtrar" aria-label="Filtrar" tamanho={44} />
          <BotaoIcone icone="mais-opcoes" aria-label="Mais opções" tamanho={40} variante="fantasma" />
          <BotaoIcone icone="lixeira" aria-label="Remover" tamanho={44} disabled />
        </Linha>
        <Linha><Rotulo>Dividido (avançar em fluxos)</Rotulo>
          <BotaoDividido rotulo="Continuar" />
          <BotaoDividido rotulo="Criar tarefa" invertido />
        </Linha>
      </div>
    ),
  },
  blocos: {
    sub: "Atalhos numa moldura (raio 28, vão 8). Ícone ou selo no topo, rótulo embaixo, ponto ou número à direita.",
    conteudo: (
      <MolduraBlocos>
        <Bloco selo="sol" rotulo="Hoje" numero={3} href="#blocos" />
        <Bloco selo="lua" rotulo="Agenda" indicador href="#blocos" />
        <Bloco selo="broto" rotulo="Tarefas" numero={24} href="#blocos" />
        <Bloco selo="espiral" rotulo="Conhecimento" href="#blocos" />
        <Bloco icone="mensagem" rotulo="Mensagens" indicador href="#blocos" />
      </MolduraBlocos>
    ),
  },
  etapas: {
    sub: "Feita = sólida + ✓ · atual = acento em pétala + ▶ · próxima = hachurada · a última termina em ponta de seta.",
    conteudo: <DemoEtapas />,
  },
  campo: {
    sub: "Sem borda, superfície tonal, rótulo dentro. Passar por cima = brilho fraco; foco = anel de acento; erro = anel vermelho + ícone + o que corrigir. Tipos: texto, título, área, busca, seleção, data.",
    conteudo: <DemoCampo />,
  },
  chip: {
    sub: "Filtro (ativo = tom mais claro + contorno + ✓ em acento), equipe (selo na cor da equipe; ativo = anel da equipe), metadado (dentro de cartões) e sugestão do Pinu.",
    conteudo: (
      <div className="grid gap-4">
        <DemoChips />
        <Linha><Rotulo>Metadado · Pinu</Rotulo>
          <Chip tipo="metadado" icone="prazo">28 out</Chip>
          <Chip tipo="metadado" icone="tarefa">3/5</Chip>
          <Chip tipo="metadado" icone="mensagem">4</Chip>
          <Chip tipo="metadado" icone="atencao">Alta</Chip>
          <Chip tipo="pinu">Sugerido: Guardiões</Chip>
        </Linha>
      </div>
    ),
  },
  badge: {
    sub: "Contagem no canto de ícones (número ou ponto, com anel da cor do fundo). Estado sempre com ícone + texto; pendente = hachurado.",
    conteudo: (
      <div className="grid gap-4">
        <Linha><Rotulo>Contagem</Rotulo>
          <span className="relative inline-grid size-11 place-items-center rounded-pilula bg-s3"><Icone nome="notificacao" tamanho={22} /><Contagem valor={3} rotulo="notificações" /></span>
          <span className="relative inline-grid size-11 place-items-center rounded-pilula bg-s3"><Icone nome="mensagem" tamanho={22} /><Contagem valor={128} rotulo="mensagens" /></span>
          <span className="relative inline-grid size-11 place-items-center rounded-pilula bg-s3"><Icone nome="calendario" tamanho={22} /><Contagem rotulo="novidade" /></span>
        </Linha>
        <Linha><Rotulo>Estado</Rotulo>
          <BadgeEstado estado="pendente" /><BadgeEstado estado="andamento" /><BadgeEstado estado="feita" /><BadgeEstado estado="atrasada" /><BadgeEstado estado="interna" />
        </Linha>
      </div>
    ),
  },
  avatar: {
    sub: "24 · 32 · 40 · 56 · 80. Foto ou iniciais sobre a cor da equipe; ponto de acento = online; selo da equipe no canto (56+). Grupo sobreposto com +N.",
    conteudo: (
      <div className="grid gap-5">
        <Linha><Rotulo>Tamanhos e equipes</Rotulo>
          <Avatar nome="Ashuan Web" equipe="escritorio" tamanho={24} />
          <Avatar nome="Kenewma Yawanawá" equipe="producao" tamanho={32} />
          <Avatar nome="Jordão Pekuti" equipe="guardioes" tamanho={40} online />
          <Avatar nome="Paulo Roberto" equipe="manutencao" tamanho={56} selo online />
          <Avatar nome="Rodrigo Andrade" equipe="escritorio" tamanho={80} selo />
          <Avatar nome="Sem Equipe" tamanho={40} />
        </Linha>
        <Linha><Rotulo>Grupo</Rotulo>
          <GrupoAvatares anel="bg" pessoas={[{ nome: "Ashuan Web", equipe: "escritorio" }, { nome: "Kenewma Yawanawá", equipe: "producao" }, { nome: "Jordão Pekuti", equipe: "guardioes" }, { nome: "Paulo Roberto", equipe: "manutencao" }, { nome: "Rodrigo Andrade", equipe: "escritorio" }]} />
          <GrupoAvatares anel="bg" tamanho={24} max={2} pessoas={[{ nome: "Ana Lima", equipe: "producao" }, { nome: "Txaty", equipe: "guardioes" }, { nome: "Yawa", equipe: "guardioes" }]} />
        </Linha>
        <Linha><Rotulo>Linha pessoa</Rotulo>
          <LinhaPessoa nome="Kenewma Yawanawá" equipe="producao" funcao="Coordenação" href="#avatar" online />
          <LinhaPessoa nome="Jordão Pekuti" equipe="guardioes" funcao="Coordenação geral" tamanho={56} />
        </Linha>
      </div>
    ),
  },
  cartao: {
    sub: "Sem borda e sem sombra; superfície 1. Destaque = o “um por tela”. Recorte = ação rápida no canto. Grade bento: 3 colunas no computador, 1 no celular.",
    conteudo: (
      <GradeBento>
        <Cartao variante="kpi">
          <CabecalhoCartao icone="tarefa" titulo="Tarefas abertas" acao="abrir-fora" hrefAcao="#cartao" />
          <NumeroKpi numero="24" unidade="/31" rotulo="desta semana" variacao={{ texto: "3 a menos que ontem", positiva: true }} />
        </Cartao>
        <Cartao variante="destaque">
          <CabecalhoCartao icone="prazo" titulo="Atrasadas" />
          <NumeroKpi numero="27" unidade=",4h" variacao={{ texto: "subiu 2 h", positiva: false }} sobreDestaque />
          <p className="corpo">O destaque da tela: só um por vista.</p>
        </Cartao>
        <Cartao variante="clicavel" href="#cartao">
          <CabecalhoCartao icone="mensagem" titulo="Cartão clicável" />
          <p className="corpo text-t2">O tom muda ao passar o mouse; o cartão todo é o link.</p>
        </Cartao>
        <Cartao variante="evento" equipe="guardioes">
          <span className="meta text-t3">14:00 – 15:30 · Sala do Santuário</span>
          <span className="titulo-cartao">Reunião mensal dos Guardiões</span>
          <span className="flex flex-wrap items-center gap-2"><Chip tipo="equipe" equipe="guardioes">Guardiões</Chip><GrupoAvatares pessoas={[{ nome: "Jordão Pekuti", equipe: "guardioes" }, { nome: "Txaty", equipe: "guardioes" }, { nome: "Yawa", equipe: "guardioes" }, { nome: "Ana Lima", equipe: "producao" }]} /></span>
        </Cartao>
        <Cartao recorte acaoRecorte={<BotaoIcone icone="abrir-fora" aria-label="Abrir tarefa" tamanho={44} />}>
          <span className="meta text-t3">Projeto Santuário</span>
          <span className="titulo-cartao">Revisar a lista de compras do retiro</span>
          <span className="flex flex-wrap items-center gap-2"><Chip tipo="metadado" icone="prazo">30 out</Chip><Chip tipo="metadado" icone="tarefa">2/6</Chip><Estado estado="andamento" /></span>
        </Cartao>
        <Cartao variante="pinu">
          <CabecalhoCartao icone="mensagem" titulo="Pinu sugere" acao="mais-opcoes" />
          <p className="corpo text-t2">3 tarefas dos Guardiões estão sem responsável. Quer que eu proponha quem pode assumir?</p>
          <span className="flex flex-wrap gap-2"><Botao icone="confirmar" tamanho="M">Propor</Botao><Botao icone="fechar" variante="fantasma" tamanho="M">Agora não</Botao></span>
        </Cartao>
      </GradeBento>
    ),
  },
  aviso: {
    sub: "Aviso = cartão com lavagem da cor do estado vinda do canto (tinta, não brilho). Toast = a mesma lavagem numa pílula que some sozinha. Diálogo = o mesmo cartão centralizado; substitui o confirm() do navegador — o único botão vermelho do sistema mora aqui.",
    conteudo: <DemoAvisos />,
  },
  abas: {
    sub: "Barra em pílula com ícone + texto; ativa = tom s3, ícone em acento e ponto embaixo; contagem em pílula. Variante pasta: a ativa se funde ao painel. Teclado: ← → Home End.",
    conteudo: <DemoAbas />,
  },
  recolhivel: {
    sub: "Título de seção + contagem + ▼ (gira ao abrir). Lembra o estado no aparelho; abre sozinha com #id na URL.",
    conteudo: <DemoRecolhivel />,
  },
  controles: {
    sub: "Controle deslizante (trilho de 64 px, rótulo à esquerda e valor à direita; também escolhe entre opções), interruptor (52 × 32) e linhas de configuração agrupadas.",
    conteudo: <DemoControles />,
  },
  segmentado: {
    sub: "Pílula com ícones; ativo = tom mais claro + contorno de 1 px. Tema, vista (lista/grade), período.",
    conteudo: <DemoSegmentado />,
  },
};

function Secao({ id, titulo, sub, children }: { id: string; titulo: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 grid gap-4 border-t border-s3 pt-8">
      <div>
        <h2 className="titulo-secao">{titulo}</h2>
        {sub && <p className="corpo text-t2 mt-1">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** Uma coluna de amostras num tema fixo (data-tema no próprio bloco). */
function Coluna({ tema, children }: { tema: "escuro" | "claro"; children: ReactNode }) {
  return (
    <div data-tema={tema} className="min-w-0 rounded-cartao bg-bg p-4 text-t1 ring-1 ring-inset ring-s3">
      <p className="rotulo-maiusculo text-t2 mb-3">{tema === "escuro" ? "Escuro" : "Claro"}</p>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
const LadoALado = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Coluna tema="escuro">{children}</Coluna>
    <Coluna tema="claro">{children}</Coluna>
  </div>
);

export default async function Design() {
  const me = await currentUser({ leitura: true });
  if (!me?.gestao) notFound();

  return (
    <TemaLocal>
      <div className="grid gap-8 pb-16">
        <header className="grid gap-2">
          <p className="rotulo-maiusculo text-t2 inline-flex items-center gap-2"><Selo nome="olho" tamanho={18} className="text-ac-text" />Design system v1</p>
          <h1 className="titulo-pagina">Design</h1>
          <p className="corpo text-t2 max-w-2xl">Referência viva de como o Nipëi OS se parece. A fonte da verdade é o documento <span className="text-t1">docs/design-system/DESIGN-SYSTEM.md</span>; esta página mostra os tokens e componentes como estão no código.</p>
        </header>

        <nav aria-label="Seções" className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {SECOES.map(([id, nome]) => (
            <a key={id} href={`#${id}`} className="anel-foco shrink-0 inline-flex min-h-11 items-center rounded-pilula bg-s2 px-4 text-sm font-medium text-t2 hover:bg-s3 hover:text-t1 transition-colors duration-150">{nome}</a>
          ))}
        </nav>

        <Secao id="cores" titulo="Cores" sub="Os mesmos tokens nos dois temas. O valor ao lado é lido do CSS.">
          {CORES.map((g) => (
            <div key={g.titulo} className="grid gap-2">
              <h3 className="titulo-cartao">{g.titulo}</h3>
              <LadoALado>
                {g.tokens.map(([tk, uso]) => (
                  <div key={tk} className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 shrink-0 rounded-interno ring-1 ring-inset ring-s3" style={{ background: `var(--${tk})` }} />
                    <span className="min-w-0 flex-1"><span className="meta block text-t1">--{tk} · <ValorToken token={tk} /></span><span className="meta block text-t2">{uso}</span></span>
                  </div>
                ))}
              </LadoALado>
            </div>
          ))}
          <div className="grid gap-2">
            <h3 className="titulo-cartao">Estados</h3>
            <LadoALado>
              {ESTADOS.map(([tk, nome, frase, icone]) => (
                <div key={tk} className="flex items-center gap-3 rounded-interno px-3 py-2.5" style={{ background: `var(--${tk}-bg)`, color: `var(--${tk})` }}>
                  <Icone nome={icone} tamanho={20} />
                  <span className="min-w-0 flex-1"><span className="corpo block font-medium">{nome} — {frase}</span><span className="meta block opacity-90">--{tk} <ValorToken token={tk} /> · --{tk}-bg <ValorToken token={`${tk}-bg`} /></span></span>
                </div>
              ))}
            </LadoALado>
          </div>
          <div className="grid gap-2">
            <h3 className="titulo-cartao">Equipes</h3>
            <p className="meta text-t2">Sempre selo + nome (nunca só a cor).</p>
            <LadoALado>
              {EQUIPES.map(([tk, nome, selo]) => (
                <div key={tk} className="flex items-center gap-3 rounded-interno bg-s1 px-3 py-2.5">
                  <span className="w-1 self-stretch rounded-pilula" style={{ background: `var(--${tk})` }} />
                  {selo ? <Selo nome={selo} tamanho={24} style={{ color: `var(--${tk})` }} /> : <span className="h-6 w-6 rounded-pilula" style={{ background: `var(--${tk})` }} />}
                  <span className="min-w-0 flex-1"><span className="corpo block" style={{ color: `var(--${tk})` }}>{nome}</span><span className="meta block text-t2">--{tk} · <ValorToken token={tk} /></span></span>
                </div>
              ))}
            </LadoALado>
          </div>
        </Secao>

        <Secao id="tipografia" titulo="Tipografia" sub="Outfit para títulos, números e rótulos de seção; Google Sans para o resto. Tamanhos: celular / computador (a partir de 1024 px).">
          <div className="grid gap-3">
            {TIPOS.map(([cls, spec, exemplo]) => (
              <div key={cls} className="grid gap-1 rounded-cartao bg-s1 p-4 min-w-0">
                <p className="meta text-t2">.{cls} · {spec}</p>
                <p className={`${cls} break-words`}>{cls === "numero-display" ? <>27<span className="text-t3">,4h</span></> : exemplo}</p>
              </div>
            ))}
          </div>
        </Secao>

        <Secao id="forma" titulo="Raios e espaço" sub="Plano: sem sombras e sem contorno como estilo. A separação vem do tom das superfícies.">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {RAIOS.map(([cls, nome]) => (
              <div key={cls} className="grid gap-2">
                <div className={`${cls} h-20 bg-s2`} />
                <p className="meta text-t2">{nome}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2 rounded-cartao bg-s1 p-4">
            {ESPACO.map(([cls, px]) => (
              <div key={px} className="flex items-center gap-3"><span className="meta w-10 text-t2 text-right tabular-nums">{px}</span><span className={`${cls} h-3 rounded-pilula bg-ac-apoio`} /></div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2"><div className="hachurado h-20 rounded-cartao" /><p className="meta text-t2">.hachurado — planejado / pendente</p></div>
            <div className="grid gap-2"><div className="brilho-ia h-20 rounded-cartao bg-s1" /><p className="meta text-t2">.brilho-ia — só o que é do Pinu</p></div>
            <div className="grid gap-2"><button type="button" className="anel-foco h-20 rounded-cartao bg-s2 text-t2 corpo">Tab até aqui</button><p className="meta text-t2">.anel-foco — foco por teclado</p></div>
          </div>
        </Secao>

        <Secao id="icones" titulo="Ícones" sub="Funcionais: 24×24, preenchidos, herdam a cor do texto. Selos: símbolos de natureza, nunca misturar lotes num grupo.">
          <h3 className="titulo-cartao">Funcionais ({Object.keys(ICONES).length})</h3>
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-5 lg:grid-cols-8">
            {(Object.keys(ICONES) as NomeIcone[]).map((n) => (
              <div key={n} className="grid justify-items-center gap-2 rounded-interno bg-s1 px-2 py-3 min-w-0">
                <Icone nome={n} tamanho={24} />
                <span className="meta text-t2 text-center break-all">{n}</span>
              </div>
            ))}
          </div>
          <h3 className="titulo-cartao">Selos em uso</h3>
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-5 lg:grid-cols-7">
            {(Object.keys(SELOS) as NomeSelo[]).map((n) => (
              <div key={n} className="grid justify-items-center gap-2 rounded-interno bg-s1 px-2 py-3 min-w-0">
                <Selo nome={n} tamanho={36} className="text-ac-text" />
                <span className="meta text-t1">{n}</span>
                <span className="meta text-t3">{SELOS[n]}</span>
              </div>
            ))}
          </div>
          <h3 className="titulo-cartao">Todos os símbolos ({Object.keys(SIMBOLOS).length})</h3>
          <p className="meta text-t2">Lote 2 sem os símbolos sagrados de outros povos (bloqueados no gerador).</p>
          <div className="grid gap-2 grid-cols-4 sm:grid-cols-8 lg:grid-cols-12">
            {(Object.keys(SIMBOLOS) as ArquivoSimbolo[]).map((n) => (
              <div key={n} className="grid justify-items-center gap-1 rounded-interno bg-s1 px-1 py-2 min-w-0" title={n}>
                <Selo nome={n} tamanho={28} />
                <span className="meta text-t3 break-all text-center">{n.replace("simbolo", "")}</span>
              </div>
            ))}
          </div>
        </Secao>

        {COMPONENTES.map(([id, nome]) => PRONTOS[id] ? <Secao key={id} id={id} titulo={nome} sub={PRONTOS[id].sub}>{PRONTOS[id].conteudo}</Secao> : (
          <Secao key={id} id={id} titulo={nome}>
            <div className="hachurado rounded-cartao px-4 py-8 text-center">
              <p className="corpo text-t2">Ainda não implementado. Chega com o componente <span className="text-t1">{nome}</span> (DESIGN-SYSTEM.md).</p>
            </div>
          </Secao>
        ))}
      </div>
    </TemaLocal>
  );
}
