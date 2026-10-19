import LoginForm from "@/components/v2/LoginForm";
import { getPessoas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { t } = await getT();
  // Whoever has a `usuario:` in their Miembros note can log in (passwords live in NIPEI_OS_USERS).
  const pessoas = getPessoas().filter((p) => p.usuario).map((p) => ({ id: p.id, name: p.name, usuario: p.usuario }));
  return (
    <div className="v2 min-h-screen flex items-center justify-center px-4 py-10 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Nipëi</h1>
        <p className="text-sm text-neutral-500 mb-6">{t.quemEntra}</p>
        <LoginForm pessoas={pessoas} labels={{ usuario: t.usuario, senha: t.senha, entrar: t.entrar, erroLogin: t.erroLogin, erroServidor: t.erroServidor }} />
      </div>
    </div>
  );
}
