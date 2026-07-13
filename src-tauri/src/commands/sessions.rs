use crate::db::connection::get_conn;
use crate::db::models::{Session, SessionLog};
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn list_sessions(
    workspace_id: Option<String>,
    agent_id: Option<String>,
) -> Result<Vec<Session>, String> {
    let conn = get_conn()?;

    let mut sql = String::from("SELECT id, workspace_id, agent_id, name, status, started_at, ended_at, created_at, updated_at FROM sessions");
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref wid) = workspace_id {
        conditions.push("workspace_id = ?".to_string());
        params.push(Box::new(wid.clone()));
    }
    if let Some(ref aid) = agent_id {
        conditions.push("agent_id = ?".to_string());
        params.push(Box::new(aid.clone()));
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }
    sql.push_str(" ORDER BY started_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let sessions = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Session {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                agent_id: row.get(2)?,
                name: row.get(3)?,
                status: row.get(4)?,
                started_at: row.get(5)?,
                ended_at: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

#[tauri::command]
pub fn create_session(
    workspace_id: String,
    agent_id: String,
    name: String,
) -> Result<Session, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO sessions (id, workspace_id, agent_id, name, status, started_at, ended_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'active', ?5, NULL, ?5, ?5)",
        rusqlite::params![id, workspace_id, agent_id, name, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Session {
        id,
        workspace_id,
        agent_id,
        name,
        status: "active".to_string(),
        started_at: now.clone(),
        ended_at: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_session(
    id: String,
    name: Option<String>,
    status: Option<String>,
) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();

    let ended_at = if status.as_deref() == Some("finished") || status.as_deref() == Some("stopped")
    {
        Some(now.clone())
    } else {
        None
    };

    let current: Session = {
        let mut stmt = conn
            .prepare("SELECT id, workspace_id, agent_id, name, status, started_at, ended_at, created_at, updated_at FROM sessions WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![id], |row| {
            Ok(Session {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                agent_id: row.get(2)?,
                name: row.get(3)?,
                status: row.get(4)?,
                started_at: row.get(5)?,
                ended_at: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
    };

    conn.execute(
        "UPDATE sessions SET name = ?1, status = ?2, ended_at = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![
            name.unwrap_or(current.name),
            status.unwrap_or(current.status),
            ended_at.or(current.ended_at),
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_session(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_session_log(
    session_id: String,
    log_type: String,
    content: String,
) -> Result<SessionLog, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO session_logs (id, session_id, type, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, session_id, log_type, content, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(SessionLog {
        id,
        session_id,
        log_type,
        content,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_session_logs(session_id: String) -> Result<Vec<SessionLog>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, session_id, type, content, created_at FROM session_logs WHERE session_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let logs = stmt
        .query_map(rusqlite::params![session_id], |row| {
            Ok(SessionLog {
                id: row.get(0)?,
                session_id: row.get(1)?,
                log_type: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(logs)
}

#[tauri::command]
pub fn export_session(session_id: String, path: String, format: String) -> Result<String, String> {
    let conn = get_conn()?;
    let session = conn
        .query_row(
            "SELECT id, workspace_id, agent_id, name, status, started_at, ended_at, created_at, updated_at FROM sessions WHERE id = ?1",
            rusqlite::params![session_id],
            |row| {
                Ok(Session {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    agent_id: row.get(2)?,
                    name: row.get(3)?,
                    status: row.get(4)?,
                    started_at: row.get(5)?,
                    ended_at: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let logs = list_session_logs(session.id.clone())?;
    let content = match format.as_str() {
        "json" => serde_json::to_string_pretty(&serde_json::json!({
            "version": 1,
            "exportedAt": Utc::now().to_rfc3339(),
            "session": session,
            "logs": logs,
        }))
        .map_err(|e| e.to_string())?,
        "markdown" => {
            let mut document = format!(
                "# {}\n\n- Status: `{}`\n- Started: {}\n- Ended: {}\n\n## Transcript\n\n",
                if session.name.is_empty() {
                    "Atena session"
                } else {
                    &session.name
                },
                session.status,
                session.started_at,
                session.ended_at.as_deref().unwrap_or("active")
            );
            for log in logs {
                document.push_str(&format!(
                    "### {} · {}\n\n```text\n{}\n```\n\n",
                    log.log_type, log.created_at, log.content
                ));
            }
            document
        }
        _ => return Err("Unsupported export format".to_string()),
    };

    std::fs::write(&path, content).map_err(|e| format!("Failed to export session: {e}"))?;
    Ok(path)
}
