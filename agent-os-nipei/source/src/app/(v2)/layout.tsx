import Link from "next/link";
import { Suspense } from "react";
import ErroAviso from "@/components/v2/ErroAviso";
import Offline from "@/components/v2/Offline";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/v2/admin";
import Nav, { BuscaPinu, PainelConta } from "@/components/v2/Nav";
import AssistenteGlobal from "@/components/v2/AssistenteGlobal";
import PulsoUso from "@/components/v2/PulsoUso";
import Avatar from "@/components/ds/Avatar";
import { BotaoIcone } from "@/components/ds/Botao";
import { Contagem } from "@/components/ds/Chip";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { MEMBER_PURPOSE, currentUser, getTarefas, novidadesPara, registrarAcesso, today } from "@/lib/v2/data";
import { getFatos, podeRevisar } from "@/lib/v2/conhecimento";
import { backupsPendentes } from "@/lib/v2/backup";
import { vigiarSaude } from "@/lib/v2/alertas";
import { getT } from "@/lib/v2/i18n";
import { logoutAction, toggleLangAction } from "./actions";
import { funcaoLigada } from "@/lib/v2/funcoes";
import ProvedorAvisos from "@/components/ds/ProvedorAvisos";
import Aviso from "@/components/ds/Aviso";
import Botao from "@/components/ds/Botao";
import Selo from "@/components/ds/Selo";

export const dynamic = "force-dynamic";

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    // Valid cookie but no access: the person's teams were switched off (or they left them).
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    redirect(verifyToken(token, MEMBER_PURPOSE) ? "/login?erro=acesso" : "/login");
  }
  if (user.pessoa && !user.vendoComo) registrarAcesso(user.pessoa.id);
  const comAssistente = funcaoLigada("assistente", user);
  backupsPendentes(); // daily Drive copy for whoever connected Google (background, at most hourly)
  vigiarSaude(); // health alerts on the admins' WhatsApp (background, at most every 10 min)
  const { t, lang } = await getT();
  const name = user.pessoa?.name ?? user.username;
  const menuFechado = (await cookies()).get("nipei_menu")?.value !== "aberto"; // recolhido por padrão; set by components/v2/Nav.tsx
  const me = user.pessoa, hoje = today();
  // ponytail: lê tarefas/fatos a cada página (como Hoje); cache se o vault crescer muito
  const contagens = {
    hoje: me ? getTarefas().filter((x) => x.status !== "done" && x.prazo && x.prazo <= hoje && x.responsaveis.includes(me.id)).length : 0,
    conhecimento: getFatos().filter((f) => f.status === "proposto" && podeRevisar(user, f)).length,
  };
  const novas = novidadesPara(user, 1).length; // sem estado "lido" ainda: só as das últimas 24 h
  const perfilHref = me ? `/pessoas/${me.id}` : "/pessoas";
  const foto = me?.foto ? `/pessoas/${me.id}/foto?v=${encodeURIComponent(me.fotoEm || me.dadosConfirmadosEm)}` : undefined;
  const conta = (
    <PainelConta perfilHref={perfilHref} idiomaAction={toggleLangAction} sairAction={logoutAction}
      rotulos={{ configuracoes: t.configuracoesLbl, perfil: t.meuPerfil, idioma: t.idioma, sair: t.sair }} />
  );

  return (
    <div className="v2 min-h-screen bg-bg text-t1">
     <ProvedorAvisos>
      {user.vendoComo && (
        <>
          {/* "ver como" (admin, read-only): impossible to miss, and always one tap from leaving */}
          <div className="print:hidden px-4 pt-3 md:px-6">
            <Aviso estado="atencao" titulo={<>Vendo a plataforma como {name}{user.gestao ? " (gestão)" : user.coordena.length ? " (coordenação)" : " (membro)"}</>}
              mensagem="Somente leitura: nada que você fizer aqui é salvo."
              acoes={<Botao href="/ver-como/sair" icone="voltar" variante="tonal" tamanho="M">Sair do “ver como”</Botao>} />
          </div>
          <a href="/ver-como/sair" className="anel-foco print:hidden fixed z-50 left-3 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] md:left-1/2 md:-translate-x-1/2 md:bottom-4 inline-flex min-h-11 items-center gap-1.5 rounded-pilula bg-warn text-eq-ink px-4 text-sm font-semibold"><Selo nome="olho" tamanho={18} />{name.split(" (")[0]} · sair</a>
        </>
      )}
      <div className="flex">
        <Nav fechadoInicial={menuFechado} pinu={comAssistente && !user.vendoComo} conta={conta} contagens={contagens} extras={{ financas: user.gestao, painel: ehAdmin(user) }}
          rotulos={{ hoje: t.hoje, tarefas: t.tarefasTitulo, agenda: t.agenda, projetos: t.projetos, objetivos: t.objetivos, equipes: t.equipes, pessoas: t.pessoas, conhecimento: t.conhecimento, acervo: t.acervo,
            financas: t.financas, painel: t.painelLbl, principal: t.grupoPrincipal, equipe: t.grupoEquipe, gestao: t.grupoGestao, recolher: t.recolherMenu, expandir: t.expandirMenu,
            configuracoes: t.configuracoesLbl, falarPinu: t.falarPinu, novidade: t.novidadeLbl }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="print:hidden flex items-center gap-2 px-4 pt-3 md:px-8 md:pt-4">
            {comAssistente && !user.vendoComo && <BuscaPinu rotulo={t.perguntePinu} className="min-w-0 flex-1 md:max-w-[460px]" />}
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="relative">
                <BotaoIcone href="/hoje?aba=novidades" icone="notificacao" aria-label={t.notificacoes} tamanho={44} variante="fantasma" />
                {novas > 0 && <Contagem valor={novas} rotulo={t.novidades} />}
              </span>
              {/* computador: avatar = meu perfil (as configurações estão no menu); celular: abre as configurações */}
              <Link href={perfilHref} aria-label={t.meuPerfil} title={t.meuPerfil} className="anel-foco hidden rounded-pilula md:block"><Avatar nome={name} foto={foto} tamanho={40} /></Link>
              <button type="button" popoverTarget="nipei-conta-cel" aria-label={t.configuracoesLbl} className="anel-foco rounded-pilula md:hidden"><Avatar nome={name} foto={foto} tamanho={40} /></button>
              <div id="nipei-conta-cel" popover="auto" className="fixed inset-auto right-4 top-[68px] m-0 overflow-visible border-0 bg-transparent p-0 md:hidden">{conta}</div>
            </div>
          </header>
          <main className="flex-1 min-w-0 px-4 md:px-8 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-10">
            <div className="mx-auto w-full max-w-6xl"><Suspense><ErroAviso /></Suspense><Offline gerado={new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })} labels={{ semConexao: t.semConexao, dadosDe: t.dadosDe, aEnviar: t.aEnviar }} />{children}{user.pessoa && !user.vendoComo && <PulsoUso />}</div>
          </main>
        </div>
      </div>
      {comAssistente && !user.vendoComo && (
        <Suspense>
          <AssistenteGlobal lang={lang} nome={name.split(/[\s(]/)[0]} labels={{ titulo: t.assistente, placeholder: t.perguntePeca, ouvindo: t.ouvindoAssist, confirmar: t.confirmar, confirmarTodas: t.confirmarTodas,
            cancelar: t.cancelar, feito: t.feitoLbl, nova: t.novaConversa, pensando: t.pensando, fechar: t.fechar, intro: t.assistenteIntro, abrir: t.abrir, semVoz: t.semVoz,
            memoria: t.memoriaAssist, memoriaIntro: t.memoriaIntro, memoriaVazia: t.memoriaVazia, esquecer: t.esquecerLbl, categorias: t.memoriaCategorias,
            vozLigar: t.vozLigar, vozDesligar: t.vozDesligar, ouvir: t.ouvirLbl, parar: t.pararLbl, propostasFala: t.propostasFala,
            oi: t.pinuOi, ajudar: t.pinuAjudar, recentes: t.pinuRecentes, falarPinu: t.falarPinu, enviar: t.enviarLbl, gerarOutra: t.gerarOutra, editarPergunta: t.editarPergunta,
            maisOpcoes: t.maisOpcoes, copiar: t.copiarTexto, proposta: t.propostaLbl, propostas: t.propostasN, ajustar: t.ajustarLbl, ajustarTexto: t.ajustarTexto }} />
        </Suspense>
      )}
     </ProvedorAvisos>
    </div>
  );
}
