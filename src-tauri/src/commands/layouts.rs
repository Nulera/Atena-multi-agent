use crate::db::connection::get_conn;
use crate::db::models::Layout;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn list_layouts(workspace_id: String) -> Result<Vec<Layout>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, name, layout_json, is_default, created_at, updated_at FROM layouts WHERE workspace_id = ?1 ORDER BY is_default DESC, updated_at DESC")
        .map_err(|e| e.to_string())?;

    let layouts = stmt
        .query_map(rusqlite::params![workspace_id], |row| {
            Ok(Layout {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                layout_json: row.get(3)?,
                is_default: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(layouts)
}

#[tauri::command]
pub fn save_layout(
    workspace_id: String,
    name: String,
    layout_json: String,
    is_default: Option<bool>,
) -> Result<Layout, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let default = is_default.unwrap_or(false);

    if default {
        let existing_id = conn
            .query_row(
                "SELECT id FROM layouts WHERE workspace_id = ?1 AND is_default = 1 LIMIT 1",
                rusqlite::params![workspace_id],
                |row| row.get::<_, String>(0),
            )
            .ok();

        if let Some(id) = existing_id {
            conn.execute(
                "UPDATE layouts SET name = ?1, layout_json = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![name, layout_json, now, id],
            )
            .map_err(|e| e.to_string())?;

            return Ok(Layout {
                id,
                workspace_id,
                name,
                layout_json,
                is_default: true,
                created_at: now.clone(),
                updated_at: now,
            });
        }

        conn.execute(
            "UPDATE layouts SET is_default = 0 WHERE workspace_id = ?1",
            rusqlite::params![workspace_id],
        )
        .map_err(|e| e.to_string())?;
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO layouts (id, workspace_id, name, layout_json, is_default, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        rusqlite::params![id, workspace_id, name, layout_json, default, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Layout {
        id,
        workspace_id,
        name,
        layout_json,
        is_default: default,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_default_layout(workspace_id: String) -> Result<Option<Layout>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, name, layout_json, is_default, created_at, updated_at FROM layouts WHERE workspace_id = ?1 AND is_default = 1 LIMIT 1")
        .map_err(|e| e.to_string())?;

    let layout = stmt
        .query_row(rusqlite::params![workspace_id], |row| {
            Ok(Layout {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                layout_json: row.get(3)?,
                is_default: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .ok();

    Ok(layout)
}

#[tauri::command]
pub fn delete_layout(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM layouts WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
