
import LinhaFonte from "./LinhaFonte";
import { EstadoVazio } from "@/components/ds/Estados";
import type { Ctx } from "./index";

/** Every source, newest first; past the first 15 behind "see all". */
export default function Fontes({ ctx }: { ctx: Ctx }) {
  const { fontes, t } = ctx;
  if (!fontes.length) return <EstadoVazio compacto titulo={<>{t.semItens}</>} />;
  return (
    <div className="overflow-hidden rounded-cartao bg-s1">
      <ul>{fontes.slice(0, 15).map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>
      {fontes.length > 15 && (
        <details className="group/mais border-t border-s2">
          <summary className="anel-foco flex min-h-11 cursor-pointer list-none items-center px-4 font-texto text-sm font-medium text-t2 hover:text-t1 group-open/mais:hidden [&::-webkit-details-marker]:hidden">{t.verTodas} ({fontes.length})</summary>
          <ul>{fontes.slice(15).map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>
        </details>
      )}
    </div>
  );
}
