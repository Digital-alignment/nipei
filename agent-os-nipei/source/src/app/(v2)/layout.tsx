import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brain, Library, LogOut, Wallet } from "lucide-react";
import Nav from "@/components/v2/Nav";
import { Avatar } from "@/components/v2/ui";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { MEMBER_PURPOSE, currentUser } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { logoutAction, toggleLangAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    // Valid cookie but no access: the person's teams were switched off (or they left them).
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    redirect(verifyToken(token, MEMBER_PURPOSE) ? "/login?erro=acesso" : "/login");
  }
  const { t } = await getT();
  const name = user.pessoa?.name ?? user.username;

  return (
    <div className="v2 min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-6 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        <Link href="/hoje" className="font-semibold tracking-tight">Nipëi</Link>
        <div className="flex items-center gap-2">
          <Link href="/conhecimento" aria-label={t.conhecimento} title={t.conhecimento} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Brain size={18} /></Link>
          <Link href="/acervo" aria-label={t.acervo} title={t.acervo} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Library size={18} /></Link>
          {user.gestao && <Link href="/financas" aria-label={t.financas} title={t.financas} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Wallet size={18} /></Link>}
          <form action={toggleLangAction}>
            <button className="text-xs rounded-md px-2 py-1 border border-neutral-300 dark:border-neutral-700">{t.idioma}</button>
          </form>
          <form action={logoutAction}>
            <button aria-label={t.sair} title={t.sair} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><LogOut size={18} /></button>
          </form>
          <Link href={user.pessoa ? `/pessoas/${user.pessoa.id}` : "/pessoas"} aria-label={t.pessoas}><Avatar name={name} size={30} /></Link>
        </div>
      </header>
      <div className="flex">
        <Nav labels={{ hoje: t.hoje, agenda: t.agenda, equipes: t.equipes, projetos: t.projetos, objetivos: t.objetivos, pessoas: t.pessoas }} />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-28 md:pb-10 max-w-3xl">{children}</main>
      </div>
    </div>
  );
}
