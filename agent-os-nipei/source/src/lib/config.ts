import { existsSync } from "fs";
import os from "os";
import path from "path";

// Where the Nipëi vault is. The rest of the old v1 config (agent CLIs, models, ~/.nipei-os/config.json) went with v1.
export function defaultVault(): string | null {
  // 1. Environment (VPS/Docker: VAULT_PATH=/vault; local tests: .env.development.local)
  const fromEnv = process.env.VAULT_PATH || process.env.AGENTIC_OS_VAULT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  // 2. Vault next to the repo (../../nipei-vault)
  const relativeVault = path.resolve(process.cwd(), "..", "..", "nipei-vault");
  if (existsSync(relativeVault)) return relativeVault;

  // 3. The local Windows workstation
  const nipeiVault = "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";
  if (existsSync(nipeiVault)) return nipeiVault;

  const naHome = path.join(os.homedir(), "nipei-vault");
  return existsSync(naHome) ? naHome : null;
}
