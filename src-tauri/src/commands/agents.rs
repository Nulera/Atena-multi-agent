use crate::db::connection::get_conn;
use crate::db::models::Agent;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn list_agents(workspace_id: String) -> Result<Vec<Agent>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, name, role, description, base_prompt, command, working_directory, status, created_at, updated_at FROM agents WHERE workspace_id = ?1 ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let agents = stmt
        .query_map(rusqlite::params![workspace_id], |row| {
            Ok(Agent {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                description: row.get(4)?,
                base_prompt: row.get(5)?,
                command: row.get(6)?,
                working_directory: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(agents)
}

#[tauri::command]
pub fn create_agent(
    workspace_id: String,
    name: String,
    role: String,
    description: String,
    base_prompt: String,
    command: String,
    working_directory: String,
) -> Result<Agent, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO agents (id, workspace_id, name, role, description, base_prompt, command, working_directory, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'idle', ?9, ?9)",
        rusqlite::params![id, workspace_id, name, role, description, base_prompt, command, working_directory, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Agent {
        id,
        workspace_id,
        name,
        role,
        description,
        base_prompt,
        command,
        working_directory,
        status: "idle".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_agent(
    id: String,
    name: Option<String>,
    role: Option<String>,
    description: Option<String>,
    base_prompt: Option<String>,
    command: Option<String>,
    working_directory: Option<String>,
    status: Option<String>,
) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();

    let current: Agent = {
        let mut stmt = conn
            .prepare("SELECT id, workspace_id, name, role, description, base_prompt, command, working_directory, status, created_at, updated_at FROM agents WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![id], |row| {
            Ok(Agent {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                description: row.get(4)?,
                base_prompt: row.get(5)?,
                command: row.get(6)?,
                working_directory: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
    };

    conn.execute(
        "UPDATE agents SET name = ?1, role = ?2, description = ?3, base_prompt = ?4, command = ?5, working_directory = ?6, status = ?7, updated_at = ?8 WHERE id = ?9",
        rusqlite::params![
            name.unwrap_or(current.name),
            role.unwrap_or(current.role),
            description.unwrap_or(current.description),
            base_prompt.unwrap_or(current.base_prompt),
            command.unwrap_or(current.command),
            working_directory.unwrap_or(current.working_directory),
            status.unwrap_or(current.status),
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_agent(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM agents WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
