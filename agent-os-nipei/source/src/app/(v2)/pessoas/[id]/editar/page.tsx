import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PerfilForm from "@/components/v2/PerfilForm";
import { currentUser, getPessoas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { inicialPerfil } from "@/lib/v2/perfil";

// "Meu perfil": the person edits their own details (gestão may edit anyone's).
export default async function EditarPerfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const p = getPessoas().find((x) => x.id === id);
  if (!p || !(me.gestao || me.pessoa?.id === id)) notFound();
  return (
    <div className="max-w-md">
      <Link href={`/pessoas/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{p.name}</Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-5">{me.pessoa?.id === id ? t.meuPerfil : p.name}</h1>
      <PerfilForm inicial={inicialPerfil(p)} t={t} voltar={`/pessoas/${id}`} />
    </div>
  );
}
