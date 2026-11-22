// What the Pinu is doing right now (DS 10.11): the tools it called in the current answer, per person, so the panel can
// show "Lendo suas tarefas…" instead of a bare "Pensando". In memory on globalThis: the server action that runs the
// conversation and the route the panel polls are different bundles, and module state is not shared between them.
// ponytail: one process (the VPS container); with several instances this would need a shared store.

const g = globalThis as unknown as { __nipeiPinuPassos?: Map<string, { passos: string[]; em: number }> };
const mapa = (g.__nipeiPinuPassos ??= new Map());

export function iniciarPassos(pessoa: string) { mapa.set(pessoa, { passos: [], em: Date.now() }); }
export function anotarPasso(pessoa: string, ferramenta: string) {
  const p = mapa.get(pessoa);
  if (p && p.passos.at(-1) !== ferramenta) p.passos.push(ferramenta);
}
export function encerrarPassos(pessoa: string) { mapa.delete(pessoa); }
/** Steps of the answer in progress (none after 2 min: a stuck turn never shows forever). */
export function getPassos(pessoa: string): string[] {
  const p = mapa.get(pessoa);
  return p && Date.now() - p.em < 120_000 ? p.passos : [];
}
