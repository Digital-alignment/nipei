import PerfilForm from "@/components/v2/PerfilForm";
import { verifyToken } from "@/lib/auth";
import { getPessoas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { inicialPerfil } from "@/lib/v2/perfil";

export const dynamic = "force-dynamic";

// Public page: the person needs no login, only the personal link (signed "cadastro" token, 30 days).
// Same form as "Meu perfil"; the token authorizes the server actions (app/perfil-actions.ts).
export default async function Cadastro({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const id = verifyToken(q.token, "cadastro");
  const p = id ? getPessoas().find((x) => x.id === id) : null;

  return (
    <div className="v2 min-h-screen px-4 py-10 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold mb-6">Nipëi</p>
        {!p ? <p className="text-sm">{t.linkInvalido}</p> : (
          <>
            <h1 className="text-2xl font-semibold">{t.cadastroTitulo}</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">{t.cadastroIntro} <span className="tabular-nums">ID {p.nipeiId}</span></p>
            <PerfilForm inicial={inicialPerfil(p)} t={t} cadastro={q.token} />
          </>
        )}
      </div>
    </div>
  );
}
