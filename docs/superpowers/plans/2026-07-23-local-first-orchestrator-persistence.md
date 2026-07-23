# Local-First Orchestrator Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist orchestration plans, normalized steps, lifecycle events, and user-created squad templates in the embedded SQLite database while migrating the legacy `localStorage` templates once.

**Architecture:** React uses a focused orchestrator gateway and persistence hook. Tauri commands translate typed camelCase payloads and delegate all SQL to Rust repositories that receive a `rusqlite::Connection`. SQLite remains the only source of truth; `localStorage` is read once as a migration fallback and is never written again.

**Tech Stack:** React 19, TypeScript 6, Vitest, Tauri 2, Rust 1.77.2, rusqlite 0.32, SQLite.

## Global Constraints

- Store all application data locally; do not add remote APIs, telemetry, accounts, or synchronization.
- Keep Rust compatible with `rust-version = "1.77.2"`.
- Use parameterized SQL and transactions for multi-record writes.
- Preserve built-in templates in source code; persist only user-created templates.
- Keep `atena:orchestrator:squad-templates` readable for one migration version, but stop writing it.
- Preserve untracked icon files and never include them in commits.
- Run the Windows application for manual validation before pushing each functional checkpoint.

---

### Task 1: Add the version 3 local schema

**Files:**

- Modify: `src-tauri/src/db/migrations.rs`
- Test: `src-tauri/src/db/migrations.rs`

**Interfaces:**

- Consumes: `run_migrations(&Connection) -> Result<(), String>`.
- Produces: schema version `3`, `squad_templates`, and normalized step columns `cli_tool`, `prompt`, and `depends_on_json`.

- [ ] **Step 1: Write the failing migration test**

Add a test that runs migrations in memory and asserts the new table and columns:

```rust
#[test]
fn creates_local_orchestrator_persistence_schema() {
    let conn = Connection::open_in_memory().expect("open database");
    run_migrations(&conn).expect("run migrations");

    let template_table: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'squad_templates'",
            [],
            |row| row.get(0),
        )
        .expect("read table");
    let step_columns: Vec<String> = conn
        .prepare("PRAGMA table_info(orchestration_steps)")
        .expect("prepare columns")
        .query_map([], |row| row.get(1))
        .expect("query columns")
        .collect::<Result<_, _>>()
        .expect("collect columns");

    assert_eq!(template_table, 1);
    assert!(step_columns.contains(&"cli_tool".to_string()));
    assert!(step_columns.contains(&"prompt".to_string()));
    assert!(step_columns.contains(&"depends_on_json".to_string()));
}
```

Update the existing schema-version assertion from `2` to `3`.

- [ ] **Step 2: Run the test and verify RED**

Run: `cargo test db::migrations::tests::creates_local_orchestrator_persistence_schema --lib`

Expected: FAIL because `squad_templates` and the three columns do not exist.

- [ ] **Step 3: Add migration version 3**

Set `LATEST_SCHEMA_VERSION` to `3` and append this migration after v2:

```rust
r#"
ALTER TABLE orchestration_steps ADD COLUMN cli_tool TEXT NOT NULL DEFAULT 'shell';
ALTER TABLE orchestration_steps ADD COLUMN prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE orchestration_steps ADD COLUMN depends_on_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE squad_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    definition_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_orch_steps_order
    ON orchestration_steps(orchestration_id, order_index);
CREATE INDEX idx_orch_events_created
    ON orchestration_events(orchestration_id, created_at);
"#,
```

- [ ] **Step 4: Verify GREEN and migration preservation**

Run: `cargo test db::migrations::tests --lib`

Expected: all migration tests PASS and the existing settings row remains intact after rerun.

- [ ] **Step 5: Commit**

```powershell
git add -- src-tauri/src/db/migrations.rs
git commit -m "feat: add local orchestrator persistence schema"
```

### Task 2: Add typed Rust repository operations

**Files:**

- Create: `src-tauri/src/repositories/mod.rs`
- Create: `src-tauri/src/repositories/orchestrations.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/db/models.rs`
- Test: `src-tauri/src/repositories/orchestrations.rs`

**Interfaces:**

- Consumes: a migrated `rusqlite::Connection` and camelCase payloads.
- Produces:
  - `save_plan(conn, workspace_id, plan) -> Result<(), String>`
  - `load_latest_plan(conn, workspace_id) -> Result<Option<OrchestrationPlanPayload>, String>`
  - `delete_plan(conn, id) -> Result<(), String>`
  - `append_event(conn, orchestration_id, step_id, event_type, content) -> Result<OrchestrationEvent, String>`
  - `list_events(conn, orchestration_id) -> Result<Vec<OrchestrationEvent>, String>`
  - CRUD functions for `SquadTemplateRecord`.

- [ ] **Step 1: Define transport models**

Add serde camelCase models to `db/models.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OrchestrationStepPayload {
    pub id: String,
    pub order: i64,
    pub agent_role: String,
    pub cli_tool: String,
    pub title: String,
    pub prompt: String,
    pub status: String,
    pub depends_on: Option<Vec<i64>>,
    pub result_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OrchestrationPlanPayload {
    pub id: String,
    pub goal: String,
    pub template_id: Option<String>,
    pub steps: Vec<OrchestrationStepPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrchestrationEvent {
    pub id: String,
    pub orchestration_id: String,
    pub step_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SquadTemplateRecord {
    pub id: String,
    pub name: String,
    pub description: String,
    pub definition_json: String,
    pub created_at: String,
    pub updated_at: String,
}
```

Do not persist `processId`; it identifies an in-memory PTY and is invalid after restart.

- [ ] **Step 2: Write failing repository tests**

Create an in-memory connection helper that runs migrations, inserts one workspace, then test:

```rust
#[test]
fn saves_and_loads_a_plan_with_ordered_steps() {
    let conn = test_connection();
    let plan = sample_plan();

    save_plan(&conn, "workspace-1", &plan).expect("save plan");
    let loaded = load_latest_plan(&conn, "workspace-1")
        .expect("load plan")
        .expect("stored plan");

    assert_eq!(loaded, plan);
}

#[test]
fn rolls_back_plan_when_a_step_is_invalid() {
    let conn = test_connection();
    let mut plan = sample_plan();
    plan.steps[0].id.clear();

    assert!(save_plan(&conn, "workspace-1", &plan).is_err());
    assert!(load_latest_plan(&conn, "workspace-1").unwrap().is_none());
}

#[test]
fn stores_templates_and_events_locally() {
    let conn = test_connection();
    let plan = sample_plan();
    save_plan(&conn, "workspace-1", &plan).expect("save plan");
    save_template(&conn, &sample_template()).expect("save template");
    append_event(&conn, &plan.id, Some(&plan.steps[0].id), "started", "step started")
        .expect("append event");

    assert_eq!(list_templates(&conn).unwrap().len(), 1);
    assert_eq!(list_events(&conn, &plan.id).unwrap().len(), 1);
}
```

- [ ] **Step 3: Run repository tests and verify RED**

Run: `cargo test repositories::orchestrations::tests --lib`

Expected: FAIL because the repository functions are not implemented.

- [ ] **Step 4: Implement transactional repositories**

`save_plan` must validate non-empty IDs, serialize the payload, and use one transaction:

```rust
pub fn save_plan(
    conn: &Connection,
    workspace_id: &str,
    plan: &OrchestrationPlanPayload,
) -> Result<(), String> {
    if workspace_id.trim().is_empty() || plan.id.trim().is_empty() {
        return Err("Workspace and plan IDs are required".to_string());
    }
    if plan.steps.iter().any(|step| step.id.trim().is_empty()) {
        return Err("Step IDs are required".to_string());
    }

    let now = Utc::now().to_rfc3339();
    let plan_json = serde_json::to_string(plan).map_err(|error| error.to_string())?;
    let transaction = conn.unchecked_transaction().map_err(|error| error.to_string())?;
    transaction.execute(
        "INSERT INTO orchestrations (id, workspace_id, title, user_goal, plan_json, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3, ?4, 'active', ?5, ?5)
         ON CONFLICT(id) DO UPDATE SET user_goal = excluded.user_goal,
             plan_json = excluded.plan_json, updated_at = excluded.updated_at",
        rusqlite::params![plan.id, workspace_id, plan.goal, plan_json, now],
    ).map_err(|error| error.to_string())?;
    transaction.execute(
        "DELETE FROM orchestration_steps WHERE orchestration_id = ?1",
        rusqlite::params![plan.id],
    ).map_err(|error| error.to_string())?;
    for step in &plan.steps {
        let dependencies = serde_json::to_string(&step.depends_on.clone().unwrap_or_default())
            .map_err(|error| error.to_string())?;
        transaction.execute(
            "INSERT INTO orchestration_steps
             (id, orchestration_id, title, description, order_index, status,
              result_summary, cli_tool, prompt, depends_on_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
            rusqlite::params![step.id, plan.id, step.title, step.agent_role,
                step.order, step.status, step.result_summary, step.cli_tool,
                step.prompt, dependencies, now],
        ).map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}
```

Load the latest plan from `plan_json ORDER BY updated_at DESC LIMIT 1`. Implement template upsert with `ON CONFLICT(id) DO UPDATE`, deterministic `ORDER BY updated_at DESC`, explicit delete, and append-only event insert using UUIDs.

- [ ] **Step 5: Verify repository GREEN**

Run: `cargo test repositories::orchestrations::tests --lib`

Expected: all repository tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src-tauri/src/repositories src-tauri/src/db/models.rs src-tauri/src/lib.rs
git commit -m "feat: add local orchestrator repositories"
```

### Task 3: Expose narrow Tauri persistence commands

**Files:**

- Create: `src-tauri/src/commands/orchestrations.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**

- Consumes: repository functions from Task 2 and `get_conn()`.
- Produces Tauri commands: `save_orchestration`, `load_latest_orchestration`, `delete_orchestration`, `append_orchestration_event`, `list_orchestration_events`, `list_squad_templates`, `save_squad_template`, `delete_squad_template`.

- [ ] **Step 1: Add thin command adapters**

Use this pattern for every command:

```rust
#[tauri::command]
pub fn save_orchestration(
    workspace_id: String,
    plan: OrchestrationPlanPayload,
) -> Result<(), String> {
    let conn = get_conn()?;
    orchestrations::save_plan(&conn, &workspace_id, &plan)
}

#[tauri::command]
pub fn load_latest_orchestration(
    workspace_id: String,
) -> Result<Option<OrchestrationPlanPayload>, String> {
    let conn = get_conn()?;
    orchestrations::load_latest_plan(&conn, &workspace_id)
}
```

Template commands accept/return `SquadTemplateRecord`; event commands accept explicit strings and return `OrchestrationEvent`. No SQL belongs in this file.

- [ ] **Step 2: Register all commands**

Export `pub mod orchestrations;` and add each command to `tauri::generate_handler!` in `lib.rs`.

- [ ] **Step 3: Verify Rust gates**

Run:

```powershell
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --lib
```

Expected: all commands compile, Clippy reports no warnings, and all Rust tests PASS on MSVC/CI. On the known local GNU harness, `cargo check --tests` is the accepted local execution substitute and CI must run `cargo test` before merge.

- [ ] **Step 4: Commit**

```powershell
git add -- src-tauri/src/commands/orchestrations.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: expose local orchestrator commands"
```

### Task 4: Add a typed frontend gateway

**Files:**

- Create: `src/features/agents/orchestrator-gateway.ts`
- Create: `src/features/agents/orchestrator-gateway.test.ts`
- Modify: `src/features/agents/orchestrator-types.ts`

**Interfaces:**

- Consumes: `invokeCommand` and existing orchestrator types.
- Produces typed functions matching the commands from Task 3.

- [ ] **Step 1: Write failing gateway tests**

Mock `@/lib/tauri-command` and assert exact command, payload, and operation names:

```typescript
it("saves a plan through the local Tauri command", async () => {
  vi.mocked(invokeCommand).mockResolvedValue(undefined)
  await saveOrchestration("workspace-1", plan)
  expect(invokeCommand).toHaveBeenCalledWith(
    "save_orchestration",
    { workspaceId: "workspace-1", plan },
    "orchestrator.save"
  )
})

it("stores a user template as versioned JSON", async () => {
  vi.mocked(invokeCommand).mockResolvedValue(templateRecord)
  await saveSquadTemplate(template)
  expect(invokeCommand).toHaveBeenCalledWith(
    "save_squad_template",
    {
      template: expect.objectContaining({ definitionJson: expect.any(String) }),
    },
    "orchestrator.template.save"
  )
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/agents/orchestrator-gateway.test.ts`

Expected: FAIL because the gateway module does not exist.

- [ ] **Step 3: Implement the gateway**

Add frontend record types with camelCase fields and functions using `invokeCommand`:

```typescript
export async function saveOrchestration(
  workspaceId: string,
  plan: OrchestrationPlan
): Promise<void> {
  await invokeCommand(
    "save_orchestration",
    { workspaceId, plan: withoutProcessIds(plan) },
    "orchestrator.save"
  )
}

export async function loadLatestOrchestration(
  workspaceId: string
): Promise<OrchestrationPlan | null> {
  return await invokeCommand(
    "load_latest_orchestration",
    { workspaceId },
    "orchestrator.loadLatest"
  )
}
```

`withoutProcessIds` returns a new plan whose steps omit ephemeral `processId`. Template serialization uses `{ version: 1, steps: template.steps }` and rejects records whose definition version is not `1` when reading.

- [ ] **Step 4: Verify gateway GREEN**

Run: `npm test -- src/features/agents/orchestrator-gateway.test.ts`

Expected: gateway tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/agents/orchestrator-gateway.ts src/features/agents/orchestrator-gateway.test.ts src/features/agents/orchestrator-types.ts
git commit -m "feat: add typed orchestrator persistence gateway"
```

### Task 5: Migrate legacy templates once

**Files:**

- Create: `src/features/agents/orchestrator-template-migration.ts`
- Create: `src/features/agents/orchestrator-template-migration.test.ts`

**Interfaces:**

- Consumes: an unknown legacy JSON string and IDs already present in SQLite.
- Produces: `parseLegacyTemplates(raw, existingIds) -> SquadTemplate[]` containing only valid, non-duplicate custom templates.

- [ ] **Step 1: Write failing validation tests**

```typescript
it("keeps valid custom templates and skips malformed entries", () => {
  const raw = JSON.stringify([
    validTemplate,
    { id: "broken", name: "Broken", steps: [{ cliTool: "remote" }] },
  ])
  expect(parseLegacyTemplates(raw, new Set())).toEqual([validTemplate])
})

it("is idempotent when SQLite already contains the template", () => {
  const raw = JSON.stringify([validTemplate])
  expect(parseLegacyTemplates(raw, new Set([validTemplate.id]))).toEqual([])
})

it("returns an empty list for malformed JSON", () => {
  expect(parseLegacyTemplates("not-json", new Set())).toEqual([])
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/agents/orchestrator-template-migration.test.ts`

Expected: FAIL because `parseLegacyTemplates` does not exist.

- [ ] **Step 3: Implement strict local validation**

Validate plain objects, non-empty string IDs/names, arrays of steps, integer order, supported `cliTool`, string role/title/prompt, and integer dependency arrays. Always return `builtIn: false`; never import an ID matching a built-in template or an existing SQLite record.

```typescript
export function parseLegacyTemplates(
  raw: string | null,
  existingIds: ReadonlySet<string>
): SquadTemplate[] {
  if (!raw) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  return value.filter(
    (candidate): candidate is SquadTemplate =>
      isValidCustomTemplate(candidate) && !existingIds.has(candidate.id)
  )
}
```

- [ ] **Step 4: Verify migration GREEN**

Run: `npm test -- src/features/agents/orchestrator-template-migration.test.ts`

Expected: all migration cases PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/agents/orchestrator-template-migration.ts src/features/agents/orchestrator-template-migration.test.ts
git commit -m "feat: validate legacy squad templates"
```

### Task 6: Integrate local persistence without blocking the UI

**Files:**

- Create: `src/features/agents/use-orchestrator-persistence.ts`
- Create: `src/features/agents/use-orchestrator-persistence.test.tsx`
- Modify: `src/features/agents/orchestrator-panel.tsx`

**Interfaces:**

- Consumes: Task 4 gateway, Task 5 parser, `getSetting`, `setSetting`, workspace ID, and the current plan.
- Produces templates and the latest plan on load, debounced plan persistence, async template CRUD, and one-time legacy migration.

- [ ] **Step 1: Write failing hook tests**

Use `renderHook`, fake timers, and mocked gateways to verify:

```typescript
it("loads the latest local plan and templates", async () => {
  vi.mocked(loadLatestOrchestration).mockResolvedValue(plan)
  vi.mocked(listSquadTemplates).mockResolvedValue([customTemplate])
  const { result } = renderHook(() => useOrchestratorPersistence("workspace-1"))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.initialPlan).toEqual(plan)
  expect(result.current.customTemplates).toEqual([customTemplate])
})

it("imports localStorage once and records the migration marker", async () => {
  localStorage.setItem(LEGACY_TEMPLATES_KEY, JSON.stringify([customTemplate]))
  vi.mocked(getSetting).mockResolvedValue(null)
  renderHook(() => useOrchestratorPersistence("workspace-1"))
  await waitFor(() =>
    expect(saveSquadTemplate).toHaveBeenCalledWith(customTemplate)
  )
  expect(setSetting).toHaveBeenCalledWith(LEGACY_MIGRATION_KEY, "complete")
})

it("debounces plan writes", async () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useOrchestratorPersistence("workspace-1"))
  act(() => result.current.persistPlan(plan))
  await act(() => vi.advanceTimersByTimeAsync(500))
  expect(saveOrchestration).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run hook tests and verify RED**

Run: `npm test -- src/features/agents/use-orchestrator-persistence.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the persistence hook**

Use constants:

```typescript
export const LEGACY_TEMPLATES_KEY = "atena:orchestrator:squad-templates"
export const LEGACY_MIGRATION_KEY = "migration.orchestratorTemplates.v1"
const SAVE_DELAY_MS = 500
```

On mount, load SQLite templates and latest workspace plan. If the marker is absent, parse the legacy value, save valid templates sequentially, reload templates, and then set the marker. Log malformed legacy input locally without throwing. `persistPlan` resets one timeout; cleanup clears it. Template save/delete updates React state only after the SQLite command succeeds.

- [ ] **Step 4: Replace panel-local persistence**

Remove `customTemplatesKey`, the localStorage-loading effect, and all
`localStorage.setItem` calls from `orchestrator-panel.tsx`. Use the hook result.
Apply `initialPlan` once after loading, await template save/delete, and call
`deleteOrchestration(plan.id)` from reset. Persist every non-null plan through
one effect instead of modifying every state transition:

```typescript
useEffect(() => {
  if (plan) persistPlan(plan)
}, [persistPlan, plan])
```

Do not block terminal process actions on persistence. If a write fails, keep the visible plan in memory and show the normalized error through the existing toast.

- [ ] **Step 5: Verify integration GREEN**

Run:

```powershell
npm test
npm run lint
npm run build
npm run format:check
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo check --tests
```

Expected: frontend tests PASS, build succeeds, no new lint warnings, Rust gates pass, and only the five pre-existing Fast Refresh warnings remain.

- [ ] **Step 6: Run Windows smoke test**

Run `npm run tauri:dev`, then verify:

1. Create a custom squad template.
2. Restart Atena and confirm the template remains.
3. Create a plan, add a step, restart, and confirm both return.
4. Delete the template and reset the plan, restart, and confirm both remain deleted.
5. Disconnect the network and repeat one create/restart cycle.

Expected: all persistence works offline and no application-data network request occurs.

- [ ] **Step 7: Commit and push the reviewed checkpoint**

```powershell
git add -- src/features/agents/orchestrator-panel.tsx src/features/agents/use-orchestrator-persistence.ts src/features/agents/use-orchestrator-persistence.test.tsx
git commit -m "feat: persist orchestrator state locally"
git push gabriel refactor-modular-architecture
```

## Follow-up Plan Boundary

Portable `.atena-backup` export/import is intentionally a separate implementation plan. It depends on the repositories and write-quiescing behavior established here and requires its own rollback and filesystem safety review.
