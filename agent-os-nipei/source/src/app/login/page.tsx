import LoginForm from "@/components/v2/LoginForm";
import { EstadoVazio } from "@/components/ds/Estados";
import Aviso from "@/components/ds/Aviso";
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
    <div className="v2 flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-t1">
      <div className="grid w-full max-w-sm gap-5">
        {/* estado vazio de destaque: padrão de selos a 5% + selo verde */}
        <EstadoVazio destaque selo="sol" titulo={<span className="font-display text-[28px] font-bold">Nipëi</span>} texto={l.sub} />
        {msg && <Aviso estado="erro" titulo={msg} />}
        <LoginForm google={googleConfigurado()} lang={lang} labels={{
          usuario: l.usuario, usuarioPh: l.usuarioPh, senha: t.senha, entrar: t.entrar, erroLogin: t.erroLogin, erroServidor: t.erroServidor,
          google: l.google, ou: l.ou, whats: l.whats, whatsPh: l.whatsPh, whatsEnviar: l.whatsEnviar, whatsVoltar: l.whatsVoltar, esqueci: l.esqueci, mostrar: l.mostrar, ocultar: l.ocultar,
        }} />
      </div>
    </div>
  );
}
