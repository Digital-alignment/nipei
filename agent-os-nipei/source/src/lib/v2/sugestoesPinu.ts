// The 2 Pinu suggestions on a Radar card (DS 10.29, phase 2): plain rules over the task, no AI.
// Self-test: npx tsx src/lib/v2/sugestoesPinu.ts

export type SugestaoPinu = "resposta" | "arquivo" | "mensagem" | "passos" | "planejar";

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const EMAIL = /\b(e-?mails?|correos?|responder|resposta|retornar o contato)\b/;
const ARQUIVO = /\b(pdf|arquivos?|documentos?|fotos?|imagens?|planilhas?|links?|drive|anexos?|subir|upload|contratos?)\b/;

/** Up to 2 suggestions, most specific first; the fallback fills with "planejar" / "mensagem". */
export function sugestoesPinu(t: { titulo: string; descricao: string; passos: number; outros: boolean; atrasada: boolean; semPrazo: boolean }): SugestaoPinu[] {
  const texto = sem(`${t.titulo} ${t.descricao.slice(0, 400)}`);
  const out: SugestaoPinu[] = [];
  const por = (x: SugestaoPinu, se: boolean) => { if (se && !out.includes(x) && out.length < 2) out.push(x); };
  por("resposta", EMAIL.test(texto));
  por("arquivo", ARQUIVO.test(texto));
  por("mensagem", t.outros);
  por("passos", t.passos === 0);
  por("planejar", t.atrasada || t.semPrazo);
  // fallback: plan it, then a message (never "split into steps" when it already has steps)
  por("planejar", true);
  por("mensagem", true);
  return out;
}

if (process.argv[1]?.endsWith("sugestoesPinu.ts")) {
  const assert = (ok: boolean, m: string) => { if (!ok) { console.error("✗", m); process.exit(1); } console.log("✓", m); };
  const base = { descricao: "", passos: 2, outros: false, atrasada: false, semPrazo: false };
  assert(JSON.stringify(sugestoesPinu({ ...base, titulo: "Responder o e-mail da Fundação" })) === '["resposta","planejar"]', "e-mail → resposta primeiro");
  assert(sugestoesPinu({ ...base, titulo: "Subir o PDF de hinos ao Drive" })[0] === "arquivo", "PDF/Drive → arquivo");
  assert(JSON.stringify(sugestoesPinu({ ...base, titulo: "Comprar sementes", outros: true, passos: 0 })) === '["mensagem","passos"]', "quem pediu + sem passos");
  assert(JSON.stringify(sugestoesPinu({ ...base, titulo: "Consertar o telhado", atrasada: true })) === '["planejar","mensagem"]', "atrasada → planejar");
  assert(sugestoesPinu({ ...base, titulo: "Revisar fotos e documentos", descricao: "mandar resposta por email" }).length === 2, "nunca mais de 2");
  assert(sugestoesPinu({ ...base, titulo: "Organizar a fogueira" }).length === 2, "fallback completa 2");
  assert(!sugestoesPinu({ ...base, titulo: "Subir o PDF" }).includes("passos"), "com passos, nunca 'Dividir em passos'");
}
