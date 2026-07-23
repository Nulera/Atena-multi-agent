# Atena Local-First Persistence Design

Date: 2026-07-23
Status: Approved for implementation planning

## Objective

Make local persistence the explicit architectural boundary for Atena. Plans,
steps, events, templates, agents, sessions, terminal logs, layouts, and settings
must remain on the user's device. The application must not depend on a remote
database, synchronization API, telemetry service, or hosted backend.

GitHub is outside this data boundary and remains used only to distribute source
code, releases, and application updates.

## Storage Architecture

Atena will use one embedded SQLite database stored in the operating system's
application-data directory. SQLite is the source of truth for operational data.
Schema changes are applied through ordered, transactional migrations recorded
with `PRAGMA user_version`.

The dependency direction is:

1. React features call typed TypeScript gateways.
2. Gateways invoke narrowly scoped Tauri commands.
3. Tauri commands delegate persistence to Rust repositories.
4. Repositories execute parameterized SQLite operations.

React components must not contain SQL, database migration logic, or direct
filesystem paths. Rust commands should translate transport data and delegate
storage behavior rather than accumulate query logic.

## Orchestrator Persistence

The existing local orchestration tables remain the basis for plans, steps, and
events. A new versioned migration will add local squad templates and any missing
constraints or indexes required by the repositories.

Persisted records will include:

- Orchestration plans scoped to a workspace.
- Ordered steps with dependencies, assigned agents, status, and result summary.
- Append-only orchestration events for relevant lifecycle changes.
- User-created squad templates with their versioned JSON definition.

Built-in templates remain source-controlled application defaults. User-created
templates are stored in SQLite and may override neither the IDs nor the content
of built-in templates.

## localStorage Migration

The current `atena:orchestrator:squad-templates` value will be supported as a
one-version migration fallback:

1. Read templates already stored in SQLite.
2. If the legacy migration marker is absent, parse the localStorage payload.
3. Validate every legacy template before importing it through the typed gateway.
4. Write the migration marker only after all valid records are committed.
5. Keep the legacy value for the remainder of that release as a recovery
   fallback, but stop writing new changes to it.
6. Remove the fallback reader in the next planned schema/application version.

Malformed legacy records are skipped and reported locally without preventing the
application from opening.

## Portable Backup

Backups are intentionally unencrypted and use an open, documented format. The
portable `.atena-backup` artifact is a standard ZIP archive with a custom file
extension and contains exactly:

- `atena.db`, a consistent SQLite database copy.
- `manifest.json`, a UTF-8 document with backup format version, database schema
  version,
  Atena version, and creation timestamp.

Export uses SQLite's backup mechanism or an equivalent consistent snapshot; it
must not copy a database while a write transaction is incomplete.

Import follows a defensive sequence:

1. Parse and validate the manifest.
2. Reject unsupported future backup or schema versions.
3. Validate the contained SQLite database with integrity and required-table
   checks.
4. Prevent new writes and wait for active database operations to finish.
5. Create a recoverable backup of the current database.
6. Replace the database and run supported forward migrations.
7. Restore the previous database automatically if replacement or migration
   fails.

The format has no password, encryption, proprietary encoding, or network step.
Users remain responsible for filesystem access to exported backup files.

## Reliability and Error Handling

- All writes use parameterized statements and transactions when multiple records
  must remain consistent.
- Foreign keys stay enabled and workspace deletion cascades only to records owned
  by that workspace.
- Repository errors are converted to the existing normalized application-error
  shape at the TypeScript gateway boundary.
- A failed persistence operation must leave the in-memory UI state visible and
  present a recoverable error; it must not silently claim success.
- Event history is append-only through normal application commands. Destructive
  cleanup is a separate, explicit operation.

## Testing Strategy

- Migration tests run against in-memory SQLite and verify schema version,
  required tables, constraints, indexes, and preservation of existing rows.
- Repository tests cover create, read, update, delete, ordering, cascade behavior,
  and transaction rollback.
- TypeScript gateway tests verify command names, payload casing, and normalized
  errors.
- Legacy migration tests cover valid payloads, malformed JSON, duplicate IDs,
  partial invalid data, and idempotent reruns.
- Backup tests cover manifest validation, integrity rejection, safe replacement,
  and rollback after simulated failure.
- A Windows smoke test verifies persistence across restart and a complete local
  export/import cycle before release.

## Scope Boundaries

This design does not add cloud synchronization, accounts, authentication,
telemetry, remote database adapters, collaboration servers, or background
uploads. Those capabilities require a separate future design and cannot be
introduced as incidental implementation details.

The first implementation plan covers orchestrator repositories and gateways,
legacy template migration, and the portable backup boundary. UI redesign and
unrelated refactoring remain outside this persistence increment.

## Success Criteria

- Atena remains fully functional without internet access after installation.
- All new operational records survive application restart in local SQLite.
- Legacy user templates migrate once without data loss.
- Exported backups are inspectable, documented, and restorable without a password.
- Failed imports preserve or automatically restore the previous database.
- No application-data request is sent to an external service.
