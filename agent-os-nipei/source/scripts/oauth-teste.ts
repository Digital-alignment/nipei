// Self-check of the MCP OAuth (lib/v2/oauthMcp.ts) in a throwaway vault: single-use codes, refresh rotation with
// 60 s grace, 90-day expiry and cleanup of orphan apps. Run: npx tsx scripts/oauth-teste.ts
import os from "os";
import assert from "assert";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import * as o from "@/lib/v2/oauthMcp";
process.env.VAULT_PATH = fs.mkdtempSync(path.join(os.tmpdir(), "nipei-oauth-"));
process.env.NIPEI_AUTH_SECRET ||= "teste-local";
const dir = path.join(process.env.VAULT_PATH, ".jobs", "oauth");
const h = (s: string) => createHash("sha256").update(s).digest("base64url");
const c = o.registrarCliente({ client_name: "Teste", redirect_uris: ["https://x.test/cb"] });
const v = "verifier-123";
const code = o.emitirCodigo("p1", c.id, "https://x.test/cb", h(v));
const t1 = o.trocarCodigo(code, v, c.id, "https://x.test/cb");
assert.throws(() => o.trocarCodigo(code, v, c.id, "https://x.test/cb")); // single use
const t2 = o.renovar(t1.refresh_token, c.id);
const t3 = o.renovar(t1.refresh_token, c.id);              // retry with old token inside grace → ok
assert.throws(() => o.renovar(t2.refresh_token, c.id));    // the lost response's token is dead
const t4 = o.renovar(t3.refresh_token, c.id);
assert.ok(o.concessaoDoToken(`Bearer ${t4.access_token}`));
// grace expires: backdate the rotation
let g = JSON.parse(fs.readFileSync(path.join(dir, "concessoes.json"), "utf-8"));
g[0].rotadoEm = new Date(Date.now() - 120_000).toISOString(); fs.writeFileSync(path.join(dir, "concessoes.json"), JSON.stringify(g));
assert.throws(() => o.renovar(t3.refresh_token, c.id));
// 90 days unused → expired everywhere
g[0].usadoEm = new Date(Date.now() - 91 * 86_400_000).toISOString(); fs.writeFileSync(path.join(dir, "concessoes.json"), JSON.stringify(g));
assert.equal(o.concessaoDoToken(`Bearer ${t4.access_token}`), null);
assert.equal(o.concessoesDe("p1").length, 0);
assert.throws(() => o.renovar(t4.refresh_token, c.id));
// orphan app older than 30 days is dropped on the next registration; a fresh one stays
const cl = JSON.parse(fs.readFileSync(path.join(dir, "clientes.json"), "utf-8"));
cl[0].criadoEm = new Date(Date.now() - 31 * 86_400_000).toISOString(); fs.writeFileSync(path.join(dir, "clientes.json"), JSON.stringify(cl));
const c2 = o.registrarCliente({ client_name: "Outro", redirect_uris: ["https://y.test/cb"] });
assert.equal(o.getCliente(c.id), null); assert.ok(o.getCliente(c2.id));
assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith(".tmp")));
console.log("oauth ok");
