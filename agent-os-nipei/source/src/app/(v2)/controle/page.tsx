import { notFound } from "next/navigation";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { AbasLinks } from "@/components/v2/VistaLinks";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Selo from "@/components/ds/Selo";
import Icone from "@/components/ds/Icone";
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
      <div className="mx-auto mt-6 grid max-w-sm gap-4 rounded-cartao bg-s1 p-6">
        <span className="grid size-14 place-items-center rounded-pilula bg-s2 text-t1"><Selo nome="olho" tamanho={32} /></span>
        <h1 className="titulo-secao">Painel de controle</h1>
        <p className="corpo text-t2">Confirme que é você. O painel fica aberto por 30 minutos neste aparelho.</p>
        {q.erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{ERROS[q.erro] ?? "Não confirmado."}</p>}
        {googleConfigurado() && <Botao href="/google/entrar?admin=1" variante="tonal" icone="abrir-fora" largo>Confirmar com Google</Botao>}
        <form action={confirmarAdminAction} className="grid gap-2">
          <Campo tipo="senha" name="senha" rotulo="Sua senha" required autoComplete="current-password" />
          <BotaoEnviar enviando="…" icone="cadeado" variante="primario" tamanho="G">Confirmar com senha</BotaoEnviar>
        </form>
      </div>
    );
  }

  const atual = MODULOS.find((m) => m.id === q.m) ?? MODULOS[0];
  const M = atual.Componente;
  return (
    <>
      <CabecalhoPagina selo="olho" rotulo="Painel de controle" titulo={atual.titulo} subtitulo={atual.descricao}
        acoes={<form action={trancarAdminAction}><BotaoEnviar enviando="…" icone="cadeado">Trancar</BotaoEnviar></form>}
        abas={<AbasLinks rotulo="Módulos do painel" ativa={atual.id} itens={MODULOS.map((m) => ({ id: m.id, rotulo: m.titulo, icone: m.icone, href: `/controle?m=${m.id}` }))} />} />
      <M q={q} />
    </>
  );
}
