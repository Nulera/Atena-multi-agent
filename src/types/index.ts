export type AgentStatus = "idle" | "running" | "paused" | "error" | "finished"

export type AgentRole =
  | "frontend"
  | "backend"
  | "ui-ux"
  | "qa"
  | "copywriter"
  | "devops"
  | "git-reviewer"
  | "project-manager"
  | "orchestrator"
  | "custom"

export interface Workspace {
  id: string
  name: string
  path: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  workspaceId: string
  name: string
  role: AgentRole
  description: string
  basePrompt: string
  command: string
  workingDirectory: string
  status: AgentStatus
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  workspaceId: string
  agentId: string
  name: string
  status: string
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionLog {
  id: string
  sessionId: string
  type: "command" | "output" | "error" | "info"
  content: string
  createdAt: string
}

export interface Layout {
  id: string
  workspaceId: string
  name: string
  layoutJson: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Setting {
  id: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}
