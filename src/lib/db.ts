import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import type {
  Workspace,
  Agent,
  Session,
  SessionLog,
  Setting,
  Layout,
} from "@/types"

// ---- Filesystem ----

export async function validatePath(path: string): Promise<boolean> {
  return await invoke<boolean>("validate_path", { path })
}

export async function pathExists(path: string): Promise<boolean> {
  return await invoke<boolean>("path_exists", { path })
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false })
  return typeof selected === "string" ? selected : null
}

// ---- Workspaces ----

export async function listWorkspaces(): Promise<Workspace[]> {
  return await invoke<Workspace[]>("list_workspaces")
}

export async function createWorkspace(
  name: string,
  path: string,
  description: string
): Promise<Workspace> {
  return await invoke<Workspace>("create_workspace", {
    name,
    path,
    description,
  })
}

export async function updateWorkspace(
  id: string,
  data: {
    name?: string
    path?: string
    description?: string
  }
): Promise<void> {
  await invoke("update_workspace", { id, ...data })
}

export async function deleteWorkspace(id: string): Promise<void> {
  await invoke("delete_workspace", { id })
}

// ---- Agents ----

export async function listAgents(workspaceId: string): Promise<Agent[]> {
  return await invoke<Agent[]>("list_agents", { workspaceId })
}

export async function createAgent(
  data: {
    workspaceId: string
    name: string
    role: string
    description: string
    basePrompt: string
    command: string
    workingDirectory: string
  }
): Promise<Agent> {
  return await invoke<Agent>("create_agent", data)
}

export async function updateAgent(
  id: string,
  data: {
    name?: string
    role?: string
    description?: string
    basePrompt?: string
    command?: string
    workingDirectory?: string
    status?: string
  }
): Promise<void> {
  await invoke("update_agent", { id, ...data })
}

export async function deleteAgent(id: string): Promise<void> {
  await invoke("delete_agent", { id })
}

// ---- Sessions ----

export async function listSessions(
  workspaceId?: string,
  agentId?: string
): Promise<Session[]> {
  return await invoke<Session[]>("list_sessions", { workspaceId, agentId })
}

export async function createSession(
  workspaceId: string,
  agentId: string,
  name: string
): Promise<Session> {
  return await invoke<Session>("create_session", {
    workspaceId,
    agentId,
    name,
  })
}

export async function updateSession(
  id: string,
  data: { name?: string; status?: string }
): Promise<void> {
  await invoke("update_session", { id, ...data })
}

export async function deleteSession(id: string): Promise<void> {
  await invoke("delete_session", { id })
}

// ---- Session Logs ----

export async function addSessionLog(
  sessionId: string,
  logType: string,
  content: string
): Promise<SessionLog> {
  return await invoke<SessionLog>("add_session_log", {
    sessionId,
    logType,
    content,
  })
}

export async function listSessionLogs(
  sessionId: string
): Promise<SessionLog[]> {
  return await invoke<SessionLog[]>("list_session_logs", { sessionId })
}

export async function exportSession(
  sessionId: string,
  path: string,
  format: "markdown" | "json"
): Promise<string> {
  return await invoke<string>("export_session", { sessionId, path, format })
}

// ---- Settings ----

export async function getSetting(key: string): Promise<string | null> {
  return await invoke<string | null>("get_setting", { key })
}

export async function setSetting(key: string, value: string): Promise<void> {
  await invoke("set_setting", { key, value })
}

export async function listSettings(): Promise<Setting[]> {
  return await invoke<Setting[]>("list_settings")
}

// ---- Layouts ----

export async function listLayouts(workspaceId: string): Promise<Layout[]> {
  return await invoke<Layout[]>("list_layouts", { workspaceId })
}

export async function saveLayout(
  workspaceId: string,
  name: string,
  layoutJson: string,
  isDefault?: boolean
): Promise<Layout> {
  return await invoke<Layout>("save_layout", {
    workspaceId,
    name,
    layoutJson,
    isDefault: isDefault ?? false,
  })
}

export async function getDefaultLayout(
  workspaceId: string
): Promise<Layout | null> {
  return await invoke<Layout | null>("get_default_layout", { workspaceId })
}

export async function deleteLayout(id: string): Promise<void> {
  await invoke("delete_layout", { id })
}
