import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Chip, Empty, Section, Title } from "@/components/v2/ui";
import AutoRefresh from "@/components/v2/AutoRefresh";
import Upload from "@/components/v2/Upload";
import { currentUser, getEquipes, getPessoas } from "@/lib/v2/data";
import { diaLocal, getFatos, getFontes, podeRevisar } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { enviarFonteAction, enviarFonteArquivoAction } from "../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const btn = "rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium";

export default async function Conhecimento({ searchParams }: { searchParams: Promise<{ q?: string; equipe?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const fontes = getFontes(), fatos = getFatos(), equipes = getEquipes(), pessoas = getPessoas();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const pendentes = (fid: string) => fatos.filter((f) => f.fonte === fid && f.status === "proposto");
  const paraMim = fontes.filter((f) => pendentes(f.id).some((x) => podeRevisar(me, x)));
  const busca = (q.q ?? "").toLowerCase().trim();
  const base = fatos.filter((f) => f.status === "confirmado" && (!q.equipe || f.equipe === q.equipe) && (!busca || f.texto.toLowerCase().includes(busca)))
    .sort((a, b) => b.revisadoEm.localeCompare(a.revisadoEm)).slice(0, 60);

  const Linha = ({ f }: { f: (typeof fontes)[number] }) => (
    <li>
      <Link href={`/conhecimento/${f.id}`} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{f.titulo || f.url || "…"}</p>
          <p className="text-xs text-neutral-500">
            {nome(f.enviadoPor)} · {fmtDate(diaLocal(f.enviadoEm), lang)} · {" "}
            {f.status === "processando" ? t.processando : f.status === "erro" ? <span className="text-red-600">{t.erroFonte}</span>
              : pendentes(f.id).length ? `${pendentes(f.id).length} ${t.fatosPropostos}` : t.pronta}
          </p>
        </div>
        <ChevronRight size={16} className="text-neutral-400" />
      </Link>
    </li>
  );

  return (
    <>
      <AutoRefresh ativo={fontes.some((f) => f.status === "processando")} />
      <Title sub={t.conhecimentoIntro}>{t.conhecimento}</Title>

      <Section title={t.enviar}>
        <div className="grid gap-3">
          <div>
            <Upload id="fonte" action={enviarFonteArquivoAction} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.csv"
              labels={{ arquivo: t.enviarArquivoFonte, foto: t.foto, enviando: t.enviando, maximo: t.maximo }} />
            <p className="text-xs text-neutral-500 mt-1">{t.formatosFonte}</p>
          </div>
          <form action={enviarFonteAction} className="grid gap-2">
            <input name="url" type="url" placeholder={t.ouColeLink} className={field} />
            <textarea name="texto" rows={3} placeholder={t.ouColeTexto} maxLength={100000} className={field} />
            <div className="flex gap-2">
              <input name="titulo" placeholder={t.tituloOpcional} maxLength={150} className={field} />
              <button className={btn}>{t.enviar}</button>
            </div>
          </form>
        </div>
      </Section>

      {paraMim.length > 0 && (
        <Section title={`${t.paraRevisar} (${paraMim.length})`}>
          <ul>{paraMim.map((f) => <Linha key={f.id} f={f} />)}</ul>
        </Section>
      )}

      <Section title={t.fontesRecentes}>
        {fontes.length ? <ul>{fontes.slice(0, 15).map((f) => <Linha key={f.id} f={f} />)}</ul> : <Empty>{t.semItens}</Empty>}
      </Section>

      <Section title={t.baseConfirmada}>
        <form className="mb-3">
          {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
          <input name="q" type="search" defaultValue={q.q} placeholder={t.buscar} className={field} />
        </form>
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip href={`/conhecimento${q.q ? `?q=${encodeURIComponent(q.q)}` : ""}`} on={!q.equipe}>{t.todas}</Chip>
          {equipes.map((e) => <Chip key={e.id} cor={e.cor} on={q.equipe === e.id} href={`/conhecimento?${new URLSearchParams({ ...(q.q ? { q: q.q } : {}), equipe: e.id })}`}>{e.nome}</Chip>)}
        </div>
        {base.length ? (
          <ul className="grid gap-2">
            {base.map((f) => (
              <li key={f.id} className="text-sm">
                <span className="text-[11px] uppercase tracking-wide text-neutral-400 mr-2">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</span>
                {f.texto} <Link href={`/conhecimento/${f.fonte}`} className="text-xs text-neutral-400 underline">↗</Link>
              </li>
            ))}
          </ul>
        ) : <Empty>{t.semItens}</Empty>}
      </Section>
    </>
  );
}
