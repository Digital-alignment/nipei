import Image from "next/image";
import LoginForm from "@/components/v2/LoginForm";
import Aviso from "@/components/ds/Aviso";
import { googleConfigurado } from "@/lib/v2/google";
import { getT } from "@/lib/v2/i18n";

export const dynamic = "force-dynamic";

// Public login page. On purpose it does NOT list who can log in.
// Never scrolls: the page is pinned to the screen and compacts by height (variants `baixa` / `deitada` in globals.css).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { t, lang } = await getT();
  const l = t.lg;
  const msg = !erro ? "" : erro === "acesso" ? t.semAcesso : erro === "link" ? t.linkInvalido : erro === "google-conta" ? l.erroGoogleConta : erro === "google-cancelado" ? l.erroGoogleCancelado : erro.startsWith("google") ? l.erroGoogle : t.linkInvalido;
  return (
    <div className="v2 grid h-dvh place-items-center overflow-hidden bg-bg px-4 text-t1">
      <div className="grid w-full max-w-sm gap-6 baixa:gap-3 deitada:max-w-2xl">
        <header className="grid justify-items-center gap-3 text-center baixa:gap-2 mini:flex mini:justify-center">
          <Image src="/icons/icon-512.png" alt="" width={88} height={88} priority className="size-22 rounded-bloco baixa:size-14 mini:size-10" />
          <h1 className="font-display text-4xl font-bold baixa:text-3xl">Nipëi</h1>
          <p className="corpo text-t2 baixa:hidden">{l.sub}</p>
        </header>
        <div className="grid gap-3">
          {msg && <Aviso estado="erro" titulo={msg} />}
          <LoginForm google={googleConfigurado()} lang={lang} labels={{
            usuario: l.usuario, usuarioPh: l.usuarioPh, senha: t.senha, entrar: t.entrar, erroLogin: t.erroLogin, erroServidor: t.erroServidor,
            google: l.google, ou: l.ou, whats: l.whats, whatsPh: l.whatsPh, whatsEnviar: l.whatsEnviar, whatsVoltar: l.whatsVoltar, esqueci: l.esqueci, mostrar: l.mostrar, ocultar: l.ocultar,
          }} />
        </div>
      </div>
    </div>
  );
}
