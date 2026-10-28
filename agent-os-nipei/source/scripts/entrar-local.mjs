// Link de entrada para o servidor de desenvolvimento (localhost), sem senha nem Google.
// Uso: npm run entrar:local -- [pessoa_id] [porta]      (padrão: o 1º de NIPEI_ADMINS ou ashuan_web; porta 3000)
//
// Por que existe: senhas e conexões Google ficam em <vault>/.jobs/, que não vai para o git — a cópia local
// do vault não as tem, então o login normal não funciona no localhost.
// Segurança: assina com o NIPEI_AUTH_SECRET dos .env locais, que é diferente do de produção; o link não vale
// em os.nipeihu.app. Dura 15 minutos e abre a sessão como no link do WhatsApp (/entrar).
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const env = {};
for (const f of [".env.local", ".env.development.local"]) {
  const p = new URL(`../${f}`, import.meta.url);
  if (!existsSync(p)) continue;
  for (const linha of readFileSync(p, "utf-8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
}
const segredo = env.NIPEI_AUTH_SECRET;
if (!segredo) { console.error("NIPEI_AUTH_SECRET não está no .env.local."); process.exit(1); }

const [pessoa = (env.NIPEI_ADMINS || "ashuan_web").split(",")[0].trim(), porta = "3000"] = process.argv.slice(2);
const agora = Math.floor(Date.now() / 1000);
const corpo = Buffer.from(JSON.stringify({ purpose: "login-link", sub: pessoa, exp: agora + 15 * 60, iat: agora })).toString("base64url");
const token = `${corpo}.${createHmac("sha256", segredo).update(corpo).digest("base64url")}`;

console.log(`Entrar como ${pessoa} (válido por 15 min, só neste computador):\n`);
console.log(`http://localhost:${porta}/entrar?token=${token}\n`);
