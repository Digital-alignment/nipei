// Read-only audit: do people notes and team notes agree on who is in which team / who coordinates?
// usage (VPS): docker cp scripts/auditar-equipes.js nipei-os:/tmp/a.js && docker exec -w /app nipei-os node /tmp/a.js /vault
// usage (local): NODE_PATH=agent-os-nipei/source/node_modules node scripts/auditar-equipes.js <vaultRoot>
const fs = require("fs"), path = require("path");
let yaml; try { yaml = require("js-yaml"); } catch { yaml = require("/app/node_modules/js-yaml"); }
const V = process.argv[2];
const fm = (f) => { const m = fs.readFileSync(f, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/); try { return (m && yaml.load(m[1])) || {}; } catch (e) { return { _erro: e.message }; } };
const arr = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const pessoas = fs.readdirSync(path.join(V, "Miembros")).filter((x) => x.endsWith(".md")).map((f) => ({ f, ...fm(path.join(V, "Miembros", f)) }))
  .filter((p) => !String(p.type || "").startsWith("ai") && !String(p.id || "").startsWith("agente_"));
const equipes = fs.readdirSync(path.join(V, "Equipes")).filter((x) => x.endsWith(".md")).map((f) => ({ f, ...fm(path.join(V, "Equipes", f)) }));
const idDe = (p) => String(p.id || p.f.replace(/\.md$/, ""));
const ids = new Set(pessoas.map(idDe));
const problemas = [];
for (const e of equipes) {
  const membros = new Set(arr(e.membros)), coords = new Set(arr(e.coordenadores));
  const dasFichas = new Set(pessoas.filter((p) => arr(p.equipes).includes(e.id)).map(idDe));
  const coordFichas = new Set(pessoas.filter((p) => arr(p.coordena).includes(e.id)).map(idDe));
  for (const x of membros) { if (!ids.has(x)) problemas.push(`${e.id}: membros cita "${x}" que não existe`); else if (!dasFichas.has(x)) problemas.push(`${e.id}: "${x}" está em membros mas a ficha não tem a equipe`); }
  for (const x of dasFichas) if (!membros.has(x)) problemas.push(`${e.id}: ficha de "${x}" tem a equipe mas não está em membros`);
  for (const x of coords) { if (!ids.has(x)) problemas.push(`${e.id}: coordenadores cita "${x}" que não existe`); else { if (!coordFichas.has(x)) problemas.push(`${e.id}: "${x}" coordena pela equipe mas a ficha não tem coordena`); } }
  for (const x of coordFichas) if (!coords.has(x)) problemas.push(`${e.id}: ficha de "${x}" diz que coordena, a equipe não`);
}
for (const p of pessoas) {
  for (const id of arr(p.equipes)) if (!equipes.some((e) => e.id === id)) problemas.push(`${idDe(p)}: ficha cita equipe inexistente "${id}"`);
  if (p.tipo_contato === "externo" && arr(p.equipes).length) problemas.push(`${idDe(p)}: contato externo mas está em equipe(s)`);
  if (p._erro) problemas.push(`${idDe(p)}: YAML inválido`);
}
console.log(`pessoas=${pessoas.length} equipes=${equipes.length} | com equipe=${pessoas.filter((p) => arr(p.equipes).length).length} externos=${pessoas.filter((p) => p.tipo_contato === "externo").length} suspensos=${pessoas.filter((p) => p.acesso_suspenso === true).length}`);
for (const e of equipes) console.log(`  ${e.id}: membros=${arr(e.membros).length} coord=${arr(e.coordenadores).join(",") || "-"}`);
console.log(problemas.length ? `INCONSISTÊNCIAS (${problemas.length}):\n- ${problemas.join("\n- ")}` : "SEM INCONSISTÊNCIAS");
