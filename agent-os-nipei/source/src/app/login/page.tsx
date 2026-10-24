import LoginForm from "@/components/v2/LoginForm";
import { googleConfigurado } from "@/lib/v2/google";
import { getT } from "@/lib/v2/i18n";

export const dynamic = "force-dynamic";

// Public login page. On purpose it does NOT list who can log in.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { t, lang } = await getT();
  const l = t.lg;
  const msg = !erro ? "" : erro === "acesso" ? t.semAcesso : erro === "link" ? t.linkInvalido : erro === "google-conta" ? l.erroGoogleConta : erro === "google-cancelado" ? l.erroGoogleCancelado : erro.startsWith("google") ? l.erroGoogle : t.linkInvalido;
  return (
    <div className="v2 min-h-screen flex items-center justify-center px-4 py-10 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl mb-3" />
          <h1 className="text-2xl font-semibold">Nipëi</h1>
          <p className="text-sm text-neutral-500 mt-1">{l.sub}</p>
        </div>
        {msg && <p className="text-sm text-red-600 dark:text-red-400 mb-4 text-center">{msg}</p>}
        <LoginForm google={googleConfigurado()} lang={lang} labels={{
          usuario: l.usuario, usuarioPh: l.usuarioPh, senha: t.senha, entrar: t.entrar, erroLogin: t.erroLogin, erroServidor: t.erroServidor,
          google: l.google, ou: l.ou, whats: l.whats, whatsPh: l.whatsPh, whatsEnviar: l.whatsEnviar, whatsVoltar: l.whatsVoltar, esqueci: l.esqueci, mostrar: l.mostrar, ocultar: l.ocultar,
        }} />
      </div>
    </div>
  );
}
