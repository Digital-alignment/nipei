// Runnable check for the recurring-task date math:  node scripts/check-recorrencia.ts  (from nipei-control/)
import assert from "assert";
import { proximoPrazo } from "../agent-os-nipei/source/src/lib/tarefaNote.ts";

assert.equal(proximoPrazo("2026-10-20", "semanal"), "2026-10-27");
assert.equal(proximoPrazo("2026-12-28", "semanal"), "2027-01-04");
assert.equal(proximoPrazo("2026-10-20", "quinzenal"), "2026-11-03");
assert.equal(proximoPrazo("2026-10-20", "mensal"), "2026-11-20");
assert.equal(proximoPrazo("2027-01-31", "mensal"), "2027-02-28");
assert.equal(proximoPrazo("2028-01-31", "mensal"), "2028-02-29");
assert.equal(proximoPrazo("", "semanal", new Date("2026-10-20T15:00:00Z")), "2026-10-27"); // no date: from today
assert.equal(proximoPrazo("9 de junio de 2026", "semanal", new Date("2026-10-20T15:00:00Z")), "2026-10-27");
console.log("recorrencia ok");
