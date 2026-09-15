# TEST_INFRA — Nipëi OS E2E Testing Infrastructure

**Architecture**: 4-Tier Opaque-Box End-to-End Verification  
**Target Repository**: `c:\Users\ondig\Code\DA\nipei control`  
**Execution Environment**: Node.js v24.14.1 (ESM Native)  
**Status**: ACTIVE & OPERATIONAL  

---

## 1. Overview & Testing Philosophy

The Nipëi OS E2E Testing Infrastructure provides end-to-end requirement validation across all system tiers, bridging:
1. **Agent To-Do & Interactive Kanban Dashboard** (`/agents-todo`, `src/lib/agentTaskStore.ts`)
2. **Company Information Intake & Vault Synchronization Engine** (`/company-intake`, `src/lib/vaultSyncEngine.ts`)
3. **Automated Vault Pre-population & Startup Parsing** (`/api/vault/prefill`, `Clientes/Nipeihu.md`, `Clientes/Digital Alignment.md`)
4. **Obsidian Vault Contract Conformance** (`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`, `command-center/scripts/vault-check.ts`)

### Core Principles
- **Opaque-Box Requirement-Driven**: Tests are designed directly against functional contracts, requirements (R1, R2, R3), and acceptance criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md` rather than internal mock shortcuts.
- **Zero Production Pollution (Hermetic Isolation)**: All tests execute within isolated sandbox vaults and state directories created under `os.tmpdir()`. The live production Obsidian vault at `C:\Users\ondig\Desktop\DA\digitalalignment` is **NEVER** mutated or written to during test runs.
- **Progressive Testability & Deterministic Concurrency**: Asynchronous file operations and concurrent multi-agent updates are coordinated through atomic write patterns (`.tmp` -> rename, with `.bak` safety copies) and thread-safe file mutexes (`withFileLock`), guaranteeing zero race conditions on Windows.
- **Authoritative Expected Output**: Expected outputs are derived from live vault note schemas (`Clientes/Nipeihu.md`, `Clientes/Digital Alignment.md`), Command Center validator specifications, and the `da-vault-schema` skill.

---

## 2. Framework Architecture & File Layout

```
c:\Users\ondig\Code\DA\nipei control\
├── tests\
│   └── e2e\
│       ├── runner.mjs                 # Master executable runner (exit code 0/1)
│       ├── harness.mjs                # Lightweight ESM testing primitives (describe, test, expect, hooks)
│       ├── fixtures.mjs               # Sandbox vault generator, mock client notes, state fixtures
│       ├── validator.mjs              # Authoritative da-vault-schema contract validator
│       ├── engine.mjs                 # Opaque-box functional adapter & task store/sync bridge
│       ├── tier1_feature_coverage.mjs # Tier 1: Feature coverage (30 tests across 5 features)
│       ├── tier2_boundary_corner.mjs  # Tier 2: Boundary, corner & adversarial verification (9 tests)
│       ├── tier3_cross_feature.mjs    # Tier 3: Cross-feature bidirectional synchronization (6 tests)
│       └── tier4_real_world.mjs       # Tier 4: Real-world production scenarios & audit (5 tests)
├── TEST_INFRA.md                      # This infrastructure specification
└── TEST_READY.md                      # Test readiness publication certificate
```

---

## 3. The 4-Tier Test Methodology & Coverage Matrix

### Tier 1: Feature Coverage (30 Test Cases)
Each core feature has >=5 comprehensive automated test cases:

#### Feature 1: Agent Tasks State Management & CRUD (6 Tests)
- `1.1 Creates task with full schema properties and timestamps`: Validates `id`, `title`, `description`, `status`, `priority`, `assignedAgent`, `tags`, `clientNoteId`, `createdAt`, `updatedAt`, `executionLogs`.
- `1.2 Retrieves task by ID and lists tasks with status filtering`: Tests individual lookups and filtered collections (`status === 'in_progress'`).
- `1.3 Updates task metadata`: Validates atomic updates to `priority`, `description`, `tags`, and `customBinaryPath`.
- `1.4 Deletes task and confirms removal from state store`: Verifies permanent removal without residue.
- `1.5 Appends timestamped execution logs`: Asserts append-only log sequencing and levels (`info`, `warn`, `error`, `output`).
- `1.6 Supports assignment to all designated agent CLIs`: Verifies `claude`, `openclaw`, `hermes`, and `custom` assignment, rejecting unsupported agents.

#### Feature 2: Kanban 4-Column Workflow & Controls (6 Tests)
- `2.1 Defaults newly created tasks to 'backlog' column`: Ensures correct initial state placement.
- `2.2 Transitions tasks progressively: backlog -> in_progress -> review -> done`: Validates the canonical 4-column progression lifecycle.
- `2.3 Filters Kanban board by assigned agent CLI category`: Verifies multi-agent isolation on the board.
- `2.4 Sorts Kanban cards by priority: urgente -> alta -> media -> baja`: Enforces correct descending priority ordering.
- `2.5 Reorders cards within same column preserving custom order index`: Validates custom positioning tags and sequencing.
- `2.6 Inspects card execution logs without altering card status`: Verifies read-only audit inspection safety.

#### Feature 3: Vault Sync Engine & Invariants (6 Tests)
- `3.1 Reads YAML frontmatter from vault note and cleanly splits body markdown`: Verifies accurate frontmatter extraction and body boundary detection.
- `3.2 Writes note atomically using .tmp and rename pattern with .bak safety copy`: Proves atomic persistence and recovery backup creation.
- `3.3 Preserves original markdown body byte-for-byte during frontmatter updates`: Guarantees human notes and qualitative sections are never wiped.
- `3.4 Injects or maintains <!-- agente: antigravity --> watermark as line 1 of body`: Validates agent attribution compliance.
- `3.5 Enforces task completion invariant: hecho: true strips intermediate estado`: Guarantees zero schema invariant violations for Command Center.
- `3.6 Strips plaintext secrets/passwords from servicios frontmatter`: Enforces `credencial_ref` security requirement.

#### Feature 4: Automated Vault Parsing & Pre-population (6 Tests)
- `4.1 Parses Clientes/Nipeihu.md extracting company profile metadata`: Verifies extraction of `id`, `nombre`, `tipo`, `rubro`, `emoji`, `dominio`, `hosting`, `stack`, `relaciones`.
- `4.2 Parses Clientes/Digital Alignment.md extracting agency profile`: Validates mother agency root configuration.
- `4.3 Converts vault note roadmap items into Kanban tasks`: Verifies 9 roadmap items conversion, preserving `hecho` flags (3 done, 6 pending).
- `4.4 Extracts proyectos array from note into structured project catalog`: Validates projects extraction with names and objectives.
- `4.5 Discovers multiple client notes in Clientes/ while ignoring system notes`: Proves `_Ecosistema.md` and `_Infraestructura.md` are filtered.
- `4.6 Tolerates missing optional fields in notes by applying sensible defaults`: Validates default fallback to `cliente_externo` and `activo`.

#### Feature 5: CLI Configurations & Environment Resolution (6 Tests)
- `5.1 Resolves Claude Code CLI binary path or env override`: Checks `AGENTIC_OS_CLAUDE_BIN` precedence.
- `5.2 Resolves OpenClaw CLI binary path or env override`: Checks `AGENTIC_OS_OPENCLAW_BIN` precedence.
- `5.3 Resolves Hermes CLI binary path or env override`: Checks `AGENTIC_OS_HERMES_BIN` precedence.
- `5.4 Resolves Custom agent CLI binary with custom command templates`: Tests `{bin} -p "{prompt}"` replacement.
- `5.5 Resolves vaultRoot prioritizing Desktop/DA/digitalalignment`: Verifies default search order.
- `5.6 Validates Windows path compatibility`: Asserts backslash path normalization and delimiter handling.

---

### Tier 2: Boundary, Corner Cases & Adversarial Verification (9 Test Cases)
- `2.1 Empty tasks collection handles listing, filtering, and sorting without error`: Validates zero-state resilience.
- `2.2 Boundary task attributes`: Tests empty description, empty tags, 1-character title, 500-character title, and whitespace rejection.
- `2.3 Malformed YAML frontmatter syntax handled gracefully without crashing`: Tests unclosed brackets and syntax corruption handling.
- `2.4 Missing frontmatter entirely (pure markdown file)`: Discards non-frontmatter documentation files silently.
- `2.5 Missing mandatory root keys (id missing or nombre missing)`: Validates strict discard rule per `da-vault-schema`.
- `2.6 Direct edge status jumps`: Validates radical jumping from `backlog` directly to `done`, then immediate reopening to `in_progress`.
- `2.7 Special characters & Unicode integrity`: Verifies Portuguese accents (`ç, ã, õ, ê, î`), indigenous characters (`Nipëi`, `Inî Rau`), emojis (`🪶`, `🏛️`, `🌿`), quotes, and special symbols.
- `2.8 Path normalization`: Proves relative paths with Windows backslashes (`Clientes\Nipeihu.md`) resolve identically to forward slashes.
- `2.9 Extreme markdown body sizes with code blocks, tables, and wiki links`: Stress tests large multi-kilobyte documents for byte-for-byte fidelity.

---

### Tier 3: Cross-Feature Combinations & Bidirectional Vault Sync (6 Test Cases)
- `3.1 Task status marked 'done' on Kanban board reflects in vault note roadmap`: Validates that moving card to `done` updates the note's roadmap item with `hecho: true` and `fecha_completado: YYYY-MM-DD`.
- `3.2 Reopening a completed task ('done' -> 'in_progress') updates vault note roadmap`: Validates that reopening removes `hecho: true` and deletes `fecha_completado`.
- `3.3 Creating a task in Kanban with clientNoteId adds a new roadmap item`: Verifies cross-module item generation in `Clientes/Nipeihu.md`.
- `3.4 Modifying a roadmap item in the vault note propagates to Kanban task state`: Tests sync from note changes back to task board.
- `3.5 Task execution logs stream continuously while preserving task status and vault consistency`: Verifies live log chunk appending during state transitions.
- `3.6 Concurrent task updates on the same brand note serialize cleanly via atomic file writes`: Simulates concurrent parallel writes without Windows file locking (`EPERM`) or lost updates.

---

### Tier 4: Real-World Scenarios & Production Acceptance (5 Test Cases)
- `4.1 Real-world startup prefill from live Clientes/Nipeihu.md`: Parses the exact real-world note structure, validating all 9 roadmap tasks and 3 active projects.
- `4.2 Real-world startup prefill from live Clientes/Digital Alignment.md`: Parses the actual mother agency note, extracting 6 projects and 3 roadmap items.
- `4.3 Full Company Intake submission workflow`: Simulates multi-step wizard submission (Company Profile, Duplo Núcleo squads, Roles with Pajé veto gates, Services with `credencial_ref`, Financial targets, Agent instructions), producing a complete markdown note.
- `4.4 Vault compliance audit`: Runs `da-vault-schema` validator on generated company intake note, asserting **0 errors and 0 warnings**.
- `4.5 End-to-end multi-agent orchestration lifecycle`: Exercises full operational loop (task creation for Claude -> dispatch -> log streaming -> review -> done -> vault sync -> compliance audit).

---

## 4. Execution & Verification

### Running the Test Suite
From the repository root (`c:\Users\ondig\Code\DA\nipei control`):

```bash
node tests/e2e/runner.mjs
```

### Exit Codes
- **`0`**: All 50 tests passed successfully.
- **`1`**: One or more tests failed (detailed failure report with stack traces is printed).

### Latest Benchmark Results
```
Total Test Suites: 8
Total Test Cases:  50
Passed:            50
Failed:            0
Duration:          544ms
Exit Code:         0
```
