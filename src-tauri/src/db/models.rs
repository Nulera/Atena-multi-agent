use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub role: String,
    pub description: String,
    pub base_prompt: String,
    pub command: String,
    pub working_directory: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub workspace_id: String,
    pub agent_id: String,
    pub name: String,
    pub status: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLog {
    pub id: String,
    pub session_id: String,
    #[serde(rename = "type")]
    pub log_type: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layout {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub layout_json: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub id: String,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

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
