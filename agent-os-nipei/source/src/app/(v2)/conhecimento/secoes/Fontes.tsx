import { Empty } from "@/components/v2/ui";
import LinhaFonte from "./LinhaFonte";
import type { Ctx } from "./index";

/** Every source, newest first; past the first 15 behind "see all". */
export default function Fontes({ ctx }: { ctx: Ctx }) {
  const { fontes, t } = ctx;
  if (!fontes.length) return <Empty>{t.semItens}</Empty>;
  return (
    <>
      <ul>{fontes.slice(0, 15).map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>
      {fontes.length > 15 && (
        <details className="group/mais">
          <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer text-sm text-neutral-500 underline py-2 group-open/mais:hidden">{t.verTodas} ({fontes.length})</summary>
          <ul>{fontes.slice(15).map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>
        </details>
      )}
    </>
  );
}
