use crate::db::connection::get_conn;
use crate::db::models::{OrchestrationEvent, OrchestrationPlanPayload, SquadTemplateRecord};
use crate::repositories::orchestrations;
use chrono::Utc;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SquadTemplateInput {
    id: String,
    name: String,
    description: String,
    definition_json: String,
}

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

#[tauri::command]
pub fn delete_orchestration(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    orchestrations::delete_plan(&conn, &id)
}

#[tauri::command]
pub fn append_orchestration_event(
    orchestration_id: String,
    step_id: Option<String>,
    event_type: String,
    content: String,
) -> Result<OrchestrationEvent, String> {
    let conn = get_conn()?;
    orchestrations::append_event(
        &conn,
        &orchestration_id,
        step_id.as_deref(),
        &event_type,
        &content,
    )
}

#[tauri::command]
pub fn list_orchestration_events(
    orchestration_id: String,
) -> Result<Vec<OrchestrationEvent>, String> {
    let conn = get_conn()?;
    orchestrations::list_events(&conn, &orchestration_id)
}

#[tauri::command]
pub fn list_squad_templates() -> Result<Vec<SquadTemplateRecord>, String> {
    let conn = get_conn()?;
    orchestrations::list_templates(&conn)
}

#[tauri::command]
pub fn save_squad_template(template: SquadTemplateInput) -> Result<SquadTemplateRecord, String> {
    let now = Utc::now().to_rfc3339();
    let record = SquadTemplateRecord {
        id: template.id,
        name: template.name,
        description: template.description,
        definition_json: template.definition_json,
        created_at: now.clone(),
        updated_at: now,
    };
    let conn = get_conn()?;
    orchestrations::save_template(&conn, &record)?;
    Ok(record)
}

#[tauri::command]
pub fn delete_squad_template(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    orchestrations::delete_template(&conn, &id)
}
