import Cartao from "@/components/ds/Cartao";
import Icone from "@/components/ds/Icone";
import CopiarBotao from "./CopiarBotao";
import { SKILLS_IA, VERSAO_SKILLS } from "@/lib/v2/skillsIA";
import type { Dict } from "@/lib/v2/i18n";

/** Conexões → official skills for the person's AI app (DS 10.27): name, when to use and instructions, each to copy. */
export default function SkillsIA({ t, gestao }: { t: Dict; gestao: boolean }) {
  const c = t.cx;
  const bloco = (rotulo: string, texto: string, longo = false) => (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="rotulo-maiusculo text-t2">{rotulo}</span>
        <CopiarBotao texto={texto} label={c.copiar} copiado={t.copiado} />
      </div>
      <p className={`corpo text-t1 ${longo ? "whitespace-pre-wrap" : ""}`}>{texto}</p>
    </div>
  );
  return (
    <Cartao className="grid gap-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-interno bg-s2 flex items-center justify-center"><Icone nome="gerar-outra" tamanho={17} /></span>
        <div className="flex-1 min-w-0"><p className="font-medium">{c.skillsTitulo}</p><p className="meta text-t2">{c.skillsVersao} {VERSAO_SKILLS}</p></div>
      </div>
      <p className="corpo text-t2">{c.skillsPorque}</p>
      <ul className="meta grid list-disc gap-1 pl-5 text-t2">{c.skillsComo.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="grid gap-2">
        {SKILLS_IA.filter((s) => gestao || !s.soGestao).map((s) => (
          <details key={s.id} className="group rounded-interno bg-s2">
            <summary className="anel-foco grid min-h-11 cursor-pointer list-none grid-cols-[auto_1fr] items-start gap-x-2 rounded-interno px-3 py-2 font-texto text-sm font-semibold">
              <Icone nome="avancar" tamanho={16} className="mt-0.5 transition-transform duration-150 group-open:rotate-90" />
              <span className="min-w-0">{s.nome}<span className="meta line-clamp-2 block font-normal text-t2">{s.quando}</span></span>
            </summary>
            <div className="grid gap-3 px-3 pb-3 pt-1">
              {bloco(c.skillsNome, s.nome)}
              {bloco(c.skillsQuando, s.quando)}
              {bloco(c.skillsInstrucoes, s.texto, true)}
            </div>
          </details>
        ))}
      </div>
    </Cartao>
  );
}
