import { open } from "@tauri-apps/plugin-dialog"
import { invokeCommand } from "@/lib/tauri-command"
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
  return await invokeCommand<boolean>("validate_path", { path }, "fs.validatePath")
}

export async function pathExists(path: string): Promise<boolean> {
  return await invokeCommand<boolean>("path_exists", { path }, "fs.pathExists")
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false })
  return typeof selected === "string" ? selected : null
}

// ---- Workspaces ----

export async function listWorkspaces(): Promise<Workspace[]> {
  return await invokeCommand<Workspace[]>(
    "list_workspaces",
    undefined,
    "workspace.list"
  )
}

export async function createWorkspace(
  name: string,
  path: string,
  description: string
): Promise<Workspace> {
  return await invokeCommand<Workspace>(
    "create_workspace",
    { name, path, description },
    "workspace.create"
  )
}

export async function updateWorkspace(
  id: string,
  data: {
    name?: string
    path?: string
    description?: string
  }
): Promise<void> {
  await invokeCommand("update_workspace", { id, ...data }, "workspace.update")
}

export async function deleteWorkspace(id: string): Promise<void> {
  await invokeCommand("delete_workspace", { id }, "workspace.delete")
}

// ---- Agents ----

export async function listAgents(workspaceId: string): Promise<Agent[]> {
  return await invokeCommand<Agent[]>(
    "list_agents",
    { workspaceId },
    "agent.list"
  )
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
  return await invokeCommand<Agent>("create_agent", data, "agent.create")
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
  await invokeCommand("update_agent", { id, ...data }, "agent.update")
}

export async function deleteAgent(id: string): Promise<void> {
  await invokeCommand("delete_agent", { id }, "agent.delete")
}

// ---- Sessions ----

export async function listSessions(
  workspaceId?: string,
  agentId?: string
): Promise<Session[]> {
  return await invokeCommand<Session[]>(
    "list_sessions",
    { workspaceId, agentId },
    "session.list"
  )
}

export async function createSession(
  workspaceId: string,
  agentId: string,
  name: string
): Promise<Session> {
  return await invokeCommand<Session>(
    "create_session",
    { workspaceId, agentId, name },
    "session.create"
  )
}

export async function updateSession(
  id: string,
  data: { name?: string; status?: string }
): Promise<void> {
  await invokeCommand("update_session", { id, ...data }, "session.update")
}

export async function deleteSession(id: string): Promise<void> {
  await invokeCommand("delete_session", { id }, "session.delete")
}

// ---- Session Logs ----

export async function addSessionLog(
  sessionId: string,
  logType: string,
  content: string
): Promise<SessionLog> {
  return await invokeCommand<SessionLog>(
    "add_session_log",
    { sessionId, logType, content },
    "session.addLog"
  )
}

export async function listSessionLogs(
  sessionId: string
): Promise<SessionLog[]> {
  return await invokeCommand<SessionLog[]>(
    "list_session_logs",
    { sessionId },
    "session.listLogs"
  )
}

export async function exportSession(
  sessionId: string,
  path: string,
  format: "markdown" | "json"
): Promise<string> {
  return await invokeCommand<string>(
    "export_session",
    { sessionId, path, format },
    "session.export"
  )
}

// ---- Settings ----

export async function getSetting(key: string): Promise<string | null> {
  return await invokeCommand<string | null>(
    "get_setting",
    { key },
    "settings.get"
  )
}

export async function setSetting(key: string, value: string): Promise<void> {
  await invokeCommand("set_setting", { key, value }, "settings.set")
}

export async function listSettings(): Promise<Setting[]> {
  return await invokeCommand<Setting[]>(
    "list_settings",
    undefined,
    "settings.list"
  )
}

// ---- Layouts ----

export async function listLayouts(workspaceId: string): Promise<Layout[]> {
  return await invokeCommand<Layout[]>(
    "list_layouts",
    { workspaceId },
    "layout.list"
  )
}

export async function saveLayout(
  workspaceId: string,
  name: string,
  layoutJson: string,
  isDefault?: boolean
): Promise<Layout> {
  return await invokeCommand<Layout>(
    "save_layout",
    {
      workspaceId,
      name,
      layoutJson,
      isDefault: isDefault ?? false,
    },
    "layout.save"
  )
}

export async function getDefaultLayout(
  workspaceId: string
): Promise<Layout | null> {
  return await invokeCommand<Layout | null>(
    "get_default_layout",
    { workspaceId },
    "layout.getDefault"
  )
}

export async function deleteLayout(id: string): Promise<void> {
  await invokeCommand("delete_layout", { id }, "layout.delete")
}
