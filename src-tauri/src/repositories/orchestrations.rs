use crate::db::models::{OrchestrationEvent, OrchestrationPlanPayload, SquadTemplateRecord};
use chrono::Utc;
use rusqlite::Connection;
use uuid::Uuid;

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
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO orchestrations
             (id, workspace_id, title, user_goal, plan_json, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?3, ?4, 'active', ?5, ?5)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                user_goal = excluded.user_goal,
                plan_json = excluded.plan_json,
                status = excluded.status,
                updated_at = excluded.updated_at",
            rusqlite::params![plan.id, workspace_id, plan.goal, plan_json, now],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "DELETE FROM orchestration_steps WHERE orchestration_id = ?1",
            rusqlite::params![plan.id],
        )
        .map_err(|error| error.to_string())?;

    for step in &plan.steps {
        let dependencies = serde_json::to_string(&step.depends_on.clone().unwrap_or_default())
            .map_err(|error| error.to_string())?;
        transaction
            .execute(
                "INSERT INTO orchestration_steps
                 (id, orchestration_id, title, description, order_index, status,
                  result_summary, cli_tool, prompt, depends_on_json, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
                rusqlite::params![
                    step.id,
                    plan.id,
                    step.title,
                    step.agent_role,
                    step.order,
                    step.status,
                    step.result_summary.as_deref().unwrap_or(""),
                    step.cli_tool,
                    step.prompt,
                    dependencies,
                    now
                ],
            )
            .map_err(|error| error.to_string())?;
    }

    transaction.commit().map_err(|error| error.to_string())
}

pub fn load_latest_plan(
    conn: &Connection,
    workspace_id: &str,
) -> Result<Option<OrchestrationPlanPayload>, String> {
    let plan_json = conn
        .query_row(
            "SELECT plan_json FROM orchestrations
             WHERE workspace_id = ?1 ORDER BY updated_at DESC LIMIT 1",
            rusqlite::params![workspace_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    plan_json
        .map(|json| serde_json::from_str(&json).map_err(|error| error.to_string()))
        .transpose()
}

pub fn delete_plan(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM orchestrations WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn append_event(
    conn: &Connection,
    orchestration_id: &str,
    step_id: Option<&str>,
    event_type: &str,
    content: &str,
) -> Result<OrchestrationEvent, String> {
    if orchestration_id.trim().is_empty() || event_type.trim().is_empty() {
        return Err("Orchestration ID and event type are required".to_string());
    }
    let event = OrchestrationEvent {
        id: Uuid::new_v4().to_string(),
        orchestration_id: orchestration_id.to_string(),
        step_id: step_id.map(str::to_string),
        event_type: event_type.to_string(),
        content: content.to_string(),
        created_at: Utc::now().to_rfc3339(),
    };
    conn.execute(
        "INSERT INTO orchestration_events
         (id, orchestration_id, step_id, type, content, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            event.id,
            event.orchestration_id,
            event.step_id,
            event.event_type,
            event.content,
            event.created_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(event)
}

pub fn list_events(
    conn: &Connection,
    orchestration_id: &str,
) -> Result<Vec<OrchestrationEvent>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id, orchestration_id, step_id, type, content, created_at
             FROM orchestration_events WHERE orchestration_id = ?1
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| error.to_string())?;
    let events = statement
        .query_map(rusqlite::params![orchestration_id], |row| {
            Ok(OrchestrationEvent {
                id: row.get(0)?,
                orchestration_id: row.get(1)?,
                step_id: row.get(2)?,
                event_type: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    Ok(events)
}

pub fn save_template(conn: &Connection, template: &SquadTemplateRecord) -> Result<(), String> {
    if template.id.trim().is_empty() || template.name.trim().is_empty() {
        return Err("Template ID and name are required".to_string());
    }
    serde_json::from_str::<serde_json::Value>(&template.definition_json)
        .map_err(|error| format!("Invalid template definition: {error}"))?;
    conn.execute(
        "INSERT INTO squad_templates
         (id, name, description, definition_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            definition_json = excluded.definition_json,
            updated_at = excluded.updated_at",
        rusqlite::params![
            template.id,
            template.name,
            template.description,
            template.definition_json,
            template.created_at,
            template.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn list_templates(conn: &Connection) -> Result<Vec<SquadTemplateRecord>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id, name, description, definition_json, created_at, updated_at
             FROM squad_templates ORDER BY updated_at DESC, id ASC",
        )
        .map_err(|error| error.to_string())?;
    let templates = statement
        .query_map([], |row| {
            Ok(SquadTemplateRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                definition_json: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    Ok(templates)
}

pub fn delete_template(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM squad_templates WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

use rusqlite::OptionalExtension;

#[cfg(test)]
mod tests {
    use super::{
        append_event, list_events, list_templates, load_latest_plan, save_plan, save_template,
    };
    use crate::db::migrations::run_migrations;
    use crate::db::models::{
        OrchestrationPlanPayload, OrchestrationStepPayload, SquadTemplateRecord,
    };
    use rusqlite::Connection;

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().expect("open database");
        run_migrations(&conn).expect("run migrations");
        conn.execute(
            "INSERT INTO workspaces (id, name, path, created_at, updated_at)
             VALUES ('workspace-1', 'Workspace', '/tmp/workspace', 'now', 'now')",
            [],
        )
        .expect("insert workspace");
        conn
    }

    fn sample_plan() -> OrchestrationPlanPayload {
        OrchestrationPlanPayload {
            id: "plan-1".to_string(),
            goal: "Ship local persistence".to_string(),
            template_id: Some("template-1".to_string()),
            steps: vec![
                OrchestrationStepPayload {
                    id: "step-1".to_string(),
                    order: 0,
                    agent_role: "planner".to_string(),
                    cli_tool: "shell".to_string(),
                    title: "Draft plan".to_string(),
                    prompt: "Outline the work".to_string(),
                    status: "pending".to_string(),
                    depends_on: None,
                    result_summary: None,
                },
                OrchestrationStepPayload {
                    id: "step-2".to_string(),
                    order: 1,
                    agent_role: "coder".to_string(),
                    cli_tool: "claude".to_string(),
                    title: "Implement repositories".to_string(),
                    prompt: "Write the SQL".to_string(),
                    status: "pending".to_string(),
                    depends_on: Some(vec![0]),
                    result_summary: Some("drafted".to_string()),
                },
            ],
        }
    }

    fn sample_template() -> SquadTemplateRecord {
        SquadTemplateRecord {
            id: "template-1".to_string(),
            name: "Review squad".to_string(),
            description: "Reviews code changes".to_string(),
            definition_json: "{\"version\":1,\"steps\":[]}".to_string(),
            created_at: "2026-07-23T00:00:00+00:00".to_string(),
            updated_at: "2026-07-23T00:00:00+00:00".to_string(),
        }
    }

    #[test]
    fn saves_and_loads_a_plan_with_ordered_steps() {
        let conn = test_connection();
        let plan = sample_plan();
        save_plan(&conn, "workspace-1", &plan).expect("save plan");
        let loaded = load_latest_plan(&conn, "workspace-1")
            .expect("load plan")
            .expect("stored plan");
        assert_eq!(loaded, plan);

        let stored_summary: String = conn
            .query_row(
                "SELECT result_summary FROM orchestration_steps WHERE id = 'step-1'",
                [],
                |row| row.get(0),
            )
            .expect("read stored result summary");
        assert_eq!(stored_summary, "");
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
        append_event(
            &conn,
            &plan.id,
            Some(&plan.steps[0].id),
            "started",
            "step started",
        )
        .expect("append event");
        assert_eq!(list_templates(&conn).unwrap().len(), 1);
        assert_eq!(list_events(&conn, &plan.id).unwrap().len(), 1);
    }
}
