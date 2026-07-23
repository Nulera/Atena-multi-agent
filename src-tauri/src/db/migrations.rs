use rusqlite::Connection;

pub const LATEST_SCHEMA_VERSION: usize = 3;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    let migrations: &[&str] = &[
        // v1 — initial schema
        r#"
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'custom',
            description TEXT NOT NULL DEFAULT '',
            base_prompt TEXT NOT NULL DEFAULT '',
            command TEXT NOT NULL DEFAULT '',
            working_directory TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'idle',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            started_at TEXT NOT NULL,
            ended_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS session_logs (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'output',
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS layouts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT 'Default',
            layout_json TEXT NOT NULL DEFAULT '{}',
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
        CREATE INDEX IF NOT EXISTS idx_session_logs_session ON session_logs(session_id);
        CREATE INDEX IF NOT EXISTS idx_layouts_workspace ON layouts(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
        "#,
        // v2 — orchestration tables
        r#"
        CREATE TABLE IF NOT EXISTS orchestrations (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            user_goal TEXT NOT NULL DEFAULT '',
            plan_json TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'planning',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orchestration_steps (
            id TEXT PRIMARY KEY,
            orchestration_id TEXT NOT NULL,
            agent_id TEXT,
            session_id TEXT,
            title TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            order_index INTEGER NOT NULL DEFAULT 0,
            depends_on_step_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            result_summary TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orchestration_events (
            id TEXT PRIMARY KEY,
            orchestration_id TEXT NOT NULL,
            step_id TEXT,
            type TEXT NOT NULL DEFAULT 'info',
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_orchestrations_workspace ON orchestrations(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_orch_steps_orch ON orchestration_steps(orchestration_id);
        CREATE INDEX IF NOT EXISTS idx_orch_events_orch ON orchestration_events(orchestration_id);
        "#,
        // v3 — local orchestrator persistence
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
    ];

    let current_version: usize = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read schema version: {error}"))?;

    for (index, migration) in migrations.iter().enumerate().skip(current_version) {
        let version = index + 1;
        let transaction = conn
            .unchecked_transaction()
            .map_err(|error| format!("Failed to start migration {version}: {error}"))?;
        transaction
            .execute_batch(migration)
            .map_err(|error| format!("Migration {version} failed: {error}"))?;
        transaction
            .pragma_update(None, "user_version", version)
            .map_err(|error| format!("Failed to record migration {version}: {error}"))?;
        transaction
            .commit()
            .map_err(|error| format!("Failed to commit migration {version}: {error}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn records_the_latest_schema_version() {
        let conn = Connection::open_in_memory().expect("open database");

        run_migrations(&conn).expect("run migrations");

        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        assert_eq!(version, 3);
    }

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

    #[test]
    fn preserves_existing_rows_when_run_again() {
        let conn = Connection::open_in_memory().expect("open database");
        run_migrations(&conn).expect("run migrations");
        conn.execute(
            "INSERT INTO settings (id, key, value, created_at, updated_at)
             VALUES ('setting-1', 'theme', 'dark', 'now', 'now')",
            [],
        )
        .expect("insert setting");

        run_migrations(&conn).expect("rerun migrations");

        let value: String = conn
            .query_row(
                "SELECT value FROM settings WHERE id = 'setting-1'",
                [],
                |row| row.get(0),
            )
            .expect("read setting");
        assert_eq!(value, "dark");
    }
}
