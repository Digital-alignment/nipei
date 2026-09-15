## 2026-09-04T23:46:39Z

You are Worker M1 (Vault Engine & Auto-population Specialist).
Your working directory is: `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_worker_m1_1`.
You MUST read the original request verbatim at:
`c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md`

Read the project architecture at:
`c:\Users\ondig\Code\DA\nipei control\PROJECT.md`

Read the vault schema contract at:
`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`

Read Explorer 3's detailed design at:
`c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_survey_3\analysis.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`
- `agent-os-nipei/source/src/lib/config.ts`
- `agent-os-nipei/source/src/app/api/vault/prefill/route.ts`
- `agent-os-nipei/source/src/app/api/vault/sync/route.ts`

Implementation Requirements:
1. In `src/lib/config.ts`:
   - Update `defaultVault()` to detect and default to `path.join(os.homedir(), "Desktop", "DA", "digitalalignment")` if it exists.
   - Patch `which()` on Windows to also check `where.exe` or environment paths if `command -v` returns null.
2. In `src/lib/vaultSyncEngine.ts`:
   - Implement `splitFrontmatter(content: string)` and YAML parser/serializer using `js-yaml` (already in `package.json`).
   - Implement `readVaultNote(relPath: string)`, `writeVaultNote(relPath: string, data: Partial<VaultNoteData>)`, `parseAllClients()`.
   - Ensure full adherence to `da-vault-schema`: preserve markdown body byte-for-byte, maintain/insert `<!-- agente: antigravity -->` on first line of body, enforce closed enums, enforce task invariant (`hecho: true` strips `estado`), use atomic file write (`.tmp` -> rename).
3. In `src/app/api/vault/prefill/route.ts`:
   - Implement `GET` endpoint returning parsed data from `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md`, converting roadmap items into tasks and extracting company profile data.
4. In `src/app/api/vault/sync/route.ts`:
   - Implement `POST` endpoint allowing atomic update or creation of note frontmatter.
5. Verification:
   - Run `npm run build` inside `agent-os-nipei/source` to ensure zero TypeScript / lint errors.
   - Test your prefill and sync endpoints.
6. Write your handoff report to `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_worker_m1_1\handoff.md`.
7. Send a message to the orchestrator upon completion.

## 2026-09-05T00:20:15Z
**Context**: Milestone 1 Vault Engine Implementation
**Content**: Checking status on M1 implementation (`src/lib/config.ts`, `src/lib/vaultSyncEngine.ts`, `src/app/api/vault/prefill/route.ts`, `src/app/api/vault/sync/route.ts`).
**Action**: Please report your current progress and ETA or finish handoff.
