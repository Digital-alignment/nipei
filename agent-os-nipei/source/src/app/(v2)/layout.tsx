import Link from "next/link";
import { Suspense } from "react";
import ErroAviso from "@/components/v2/ErroAviso";
import Offline from "@/components/v2/Offline";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brain, Library, LogOut, Wallet } from "lucide-react";
import Nav from "@/components/v2/Nav";
import AssistenteGlobal from "@/components/v2/AssistenteGlobal";
import { Avatar } from "@/components/v2/ui";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { MEMBER_PURPOSE, currentUser, registrarAcesso } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { logoutAction, toggleLangAction } from "./actions";

export const dynamic = "force-dynamic";

const ICONE = "flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors";

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    // Valid cookie but no access: the person's teams were switched off (or they left them).
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    redirect(verifyToken(token, MEMBER_PURPOSE) ? "/login?erro=acesso" : "/login");
  }
  if (user.pessoa) registrarAcesso(user.pessoa.id);
  const { t, lang } = await getT();
  const name = user.pessoa?.name ?? user.username;
  const menuFechado = (await cookies()).get("nipei_menu")?.value === "fechado"; // set by components/v2/Nav.tsx

  return (
    <div className="v2 min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="print:hidden sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-6 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        <Link href="/hoje" aria-label="Nipëi" className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
          {/* app icon (public/icons, generated from public/brand) — light, crisp up to 3× screens */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Nipëi" width={36} height={36} className="w-9 h-9 rounded-xl ring-1 ring-black/5 dark:ring-white/10" />
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link href="/conhecimento" aria-label={t.conhecimento} title={t.conhecimento} className={ICONE}><Brain size={19} /></Link>
          <Link href="/acervo" aria-label={t.acervo} title={t.acervo} className={ICONE}><Library size={19} /></Link>
          {user.gestao && <Link href="/financas" aria-label={t.financas} title={t.financas} className={ICONE}><Wallet size={19} /></Link>}
          {!user.pessoa && (
            // no profile to hold the language switch → keep it here
            <form action={toggleLangAction}><button className="text-xs rounded-md px-2 py-1 border border-neutral-300 dark:border-neutral-700">{t.idioma}</button></form>
          )}
          <Link href={user.pessoa ? `/pessoas/${user.pessoa.id}` : "/pessoas"} aria-label={t.meuPerfil} title={t.meuPerfil} className="mx-1 sm:mx-1.5 rounded-full ring-2 ring-transparent hover:ring-neutral-300 dark:hover:ring-neutral-700 transition"><Avatar name={name} size={32} src={user.pessoa?.foto ? `/pessoas/${user.pessoa.id}/foto?v=${encodeURIComponent(user.pessoa.fotoEm || user.pessoa.dadosConfirmadosEm)}` : undefined} /></Link>
          <form action={logoutAction}>
            <button aria-label={t.sair} title={t.sair} className={ICONE}><LogOut size={19} /></button>
          </form>
        </div>
      </header>
      <div className="flex">
        <Nav fechadoInicial={menuFechado} assistente={user.gestao ? t.assistente : undefined} labels={{ hoje: t.hoje, agenda: t.agenda, equipes: t.equipes, projetos: t.projetos, objetivos: t.objetivos, pessoas: t.pessoas, recolher: t.recolherMenu, expandir: t.expandirMenu }} />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-10">
          <div className="mx-auto w-full max-w-6xl"><Suspense><ErroAviso /></Suspense><Offline gerado={new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })} labels={{ semConexao: t.semConexao, dadosDe: t.dadosDe, aEnviar: t.aEnviar }} />{children}</div>
        </main>
      </div>
      {user.gestao && (
        <Suspense>
          <AssistenteGlobal lang={lang} labels={{ titulo: t.assistente, placeholder: t.perguntePeca, ouvindo: t.ouvindoAssist, confirmar: t.confirmar, confirmarTodas: t.confirmarTodas,
            cancelar: t.cancelar, feito: t.feitoLbl, nova: t.novaConversa, pensando: t.pensando, fechar: t.fechar, intro: t.assistenteIntro, abrir: t.abrirAssistente, semVoz: t.semVoz,
            memoria: t.memoriaAssist, memoriaIntro: t.memoriaIntro, memoriaVazia: t.memoriaVazia, esquecer: t.esquecerLbl, categorias: t.memoriaCategorias,
            vozLigar: t.vozLigar, vozDesligar: t.vozDesligar, ouvir: t.ouvirLbl, parar: t.pararLbl, propostasFala: t.propostasFala }} />
        </Suspense>
      )}
    </div>
  );
}
