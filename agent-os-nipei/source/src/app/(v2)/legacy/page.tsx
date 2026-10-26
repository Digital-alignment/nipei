
import { getT } from "@/lib/v2/i18n";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";

// The v1 pages keep their URLs and their own sidebar; this is just the way back in.
const V1 = [
  ["/mi-portal", "Mi Portal"], ["/kanban", "Kanban"], ["/organograma", "Organograma"], ["/empresas", "Empresas"],
  ["/memory", "Memória (Vault)"], ["/ingestion", "Ingestão"], ["/venu", "Venu"], ["/hermes", "Hermes"], ["/overview", "Overview"],
];

export default async function Legacy() {
  const { t } = await getT();
  return (
    <>
      <CabecalhoPagina titulo={<>{t.versaoAnterior}</>} subtitulo={t.legacyIntro} />
      <div className="grid gap-2 sm:grid-cols-2">
        {V1.map(([href, label]) => <Cartao key={href} variante="clicavel" href={href} className="block"><span className="text-sm font-medium">{label}</span> <span className="text-xs text-t2">{href}</span></Cartao>)}
      </div>
    </>
  );
}
