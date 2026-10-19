import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { CADASTRO_FIELDS, getPessoas, saveCadastro } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

// Public page: the person needs no login, only the personal link (signed "cadastro" token, 30 days).
async function salvar(form: FormData) {
  "use server";
  const token = String(form.get("token") ?? "");
  const id = verifyToken(token, "cadastro");
  if (!id) redirect("/cadastro");
  saveCadastro(id, Object.fromEntries(CADASTRO_FIELDS.map((k) => [k, String(form.get(k) ?? "")])));
  redirect(`/cadastro?token=${encodeURIComponent(token)}&ok=1`);
}

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ token?: string; ok?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const id = verifyToken(q.token, "cadastro");
  const p = id ? getPessoas().find((x) => x.id === id) : null;

  return (
    <div className="v2 min-h-screen px-4 py-10 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold mb-6">Nipëi</p>
        {!p ? <p className="text-sm">{t.linkInvalido}</p> : q.ok ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">{t.obrigado}</h1>
            <p className="text-sm text-neutral-500">ID {p.nipeiId}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{t.cadastroTitulo}</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">{t.cadastroIntro} <span className="font-mono">ID {p.nipeiId}</span></p>
            <form action={salvar} className="grid gap-4">
              <input type="hidden" name="token" value={q.token} />
              <label className="grid gap-1 text-sm">{t.nome}<input name="name" defaultValue={p.name} required maxLength={120} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.nomeNativo}<input name="native_name" defaultValue={p.nativeName} maxLength={120} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.whatsapp}<input name="whatsapp" type="tel" inputMode="tel" defaultValue={p.whatsapp} placeholder="+55 73 9…" maxLength={30} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.email}<input name="email" type="email" defaultValue={p.email} maxLength={120} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.area}<input name="area" defaultValue={p.area} maxLength={200} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.funcao}<textarea name="funcao" defaultValue={p.funcao} rows={3} maxLength={300} className={field} /></label>
              <label className="grid gap-1 text-sm">{t.disponibilidade}<input name="disponibilidade" defaultValue={p.disponibilidade} maxLength={200} className={field} /></label>
              <button className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium">{t.salvar}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
