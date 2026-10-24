import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser } from "@/lib/v2/data";
import { adminConfirmado, ehAdmin } from "@/lib/v2/admin";
import { googleConfigurado } from "@/lib/v2/google";
import { confirmarAdminAction, trancarAdminAction } from "./acoes";
import { MODULOS } from "./modulos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nipëi", robots: { index: false, follow: false } };

const ERROS: Record<string, string> = { senha: "Senha incorreta.", bloqueado: "Muitas tentativas. Espere 15 minutos.", google: "Não deu para confirmar com o Google." };

// Technical admin panel — only the people in NIPEI_ADMINS (server env). Everyone else: 404, as if it didn't exist.
export default async function Controle({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await currentUser();
  if (!me || !ehAdmin(me)) notFound();
  const q = await searchParams;

  if (!(await adminConfirmado(me))) {
    return (
      <div className="max-w-sm mx-auto mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 grid gap-4">
        <p className="font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-green-600" />Painel de controle</p>
        <p className="text-sm text-neutral-500">Confirme que é você. O painel fica aberto por 30 minutos neste aparelho.</p>
        {q.erro && <p className="text-sm text-red-600 dark:text-red-400">{ERROS[q.erro] ?? "Não confirmado."}</p>}
        {googleConfigurado() && <a href="/google/entrar?admin=1" className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-center">Confirmar com Google</a>}
        <form action={confirmarAdminAction} className="grid gap-2">
          <input name="senha" type="password" required autoComplete="current-password" placeholder="Sua senha" className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm" />
          <BotaoEnviar enviando="…" className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">Confirmar com senha</BotaoEnviar>
        </form>
      </div>
    );
  }

  const atual = MODULOS.find((m) => m.id === q.m) ?? MODULOS[0];
  const M = atual.Componente;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck size={20} className="text-green-600" />Painel de controle</h1>
          <p className="text-sm text-neutral-500">{atual.descricao}</p>
        </div>
        <form action={trancarAdminAction}><BotaoEnviar enviando="…" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><Lock size={14} />Trancar</BotaoEnviar></form>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto">
        {MODULOS.map((m) => (
          <Link key={m.id} href={`/controle?m=${m.id}`} className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${m.id === atual.id ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-700"}`}>
            <m.icone size={15} />{m.titulo}
          </Link>
        ))}
      </nav>
      <M q={q} />
    </div>
  );
}
