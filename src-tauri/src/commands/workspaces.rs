use crate::db::connection::get_conn;
use crate::db::models::Workspace;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn list_workspaces() -> Result<Vec<Workspace>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, name, path, description, created_at, updated_at FROM workspaces ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let workspaces = stmt
        .query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workspaces)
}

#[tauri::command]
pub fn create_workspace(name: String, path: String, description: String) -> Result<Workspace, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO workspaces (id, name, path, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        rusqlite::params![id, name, path, description, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Workspace {
        id,
        name,
        path,
        description,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_workspace(id: String, name: Option<String>, path: Option<String>, description: Option<String>) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();

    let current: Workspace = {
        let mut stmt = conn
            .prepare("SELECT id, name, path, description, created_at, updated_at FROM workspaces WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![id], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
    };

    conn.execute(
        "UPDATE workspaces SET name = ?1, path = ?2, description = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![
            name.unwrap_or(current.name),
            path.unwrap_or(current.path),
            description.unwrap_or(current.description),
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_workspace(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM workspaces WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
