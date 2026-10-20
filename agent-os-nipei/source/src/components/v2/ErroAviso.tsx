"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Shows the ?erro= message an action sent back (e.g. the AI failed), with a button to dismiss it. */
export default function ErroAviso() {
  const erro = useSearchParams().get("erro");
  const router = useRouter(), path = usePathname(), params = useSearchParams();
  if (!erro) return null;
  const fechar = () => {
    const p = new URLSearchParams(params.toString());
    p.delete("erro");
    router.replace(p.size ? `${path}?${p}` : path);
  };
  return (
    <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
      <span>⚠️ {erro}</span>
      <button type="button" onClick={fechar} aria-label="Fechar" className="text-red-700 dark:text-red-300">✕</button>
    </div>
  );
}
