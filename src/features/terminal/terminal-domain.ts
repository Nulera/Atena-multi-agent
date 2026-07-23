export type TerminalStatus =
  | "starting"
  | "open"
  | "idle"
  | "running"
  | "stopping"
  | "stopped"
  | "failed"

export interface TerminalState {
  status: TerminalStatus
  processId: string | null
  cli: string
  resumeCommand: string
  error?: string
}

export type TerminalEvent =
  | { type: "START"; cli: string; resumeCommand?: string }
  | { type: "ATTACHED"; processId: string }
  | { type: "PROMPT" }
  | { type: "ACTIVITY"; cli: string; resumeCommand?: string }
  | { type: "STOP" }
  | { type: "EXITED" }
  | { type: "FAILED"; error: string }

export const initialTerminalState: TerminalState = {
  status: "open",
  processId: null,
  cli: "PowerShell",
  resumeCommand: "",
}

const ANSI_ESCAPE_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  "g"
)

export function detectCli(commandLine: string): string {
  const command = commandLine.trim().replace(/^[&.]\s+/, "")
  const knownCli = command.match(
    /(?:^|[^a-z0-9-])(claude(?:-code)?|claudecode|codex(?:-cli)?|openai-codex|opencode)(?=\W|$)/i
  )?.[1]

  if (knownCli) {
    const normalized = knownCli.toLowerCase()
    if (normalized.startsWith("claude")) return "claude"
    if (normalized.includes("codex")) return "codex"
    return "opencode"
  }

  const firstToken = command.match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/)
  const executable = firstToken?.[1] || firstToken?.[2] || firstToken?.[3]
  if (!executable) return "PowerShell"
  return (
    executable.split(/[\\/]/).pop()?.replace(/\.(exe|cmd|bat|ps1)$/i, "") ||
    "PowerShell"
  )
}

export function stripAnsi(output: string): string {
  return output.replace(ANSI_ESCAPE_PATTERN, "")
}

export function transitionTerminal(
  state: TerminalState,
  event: TerminalEvent
): TerminalState {
  switch (event.type) {
    case "START":
      return {
        status: "starting",
        processId: null,
        cli: event.cli,
        resumeCommand: event.resumeCommand ?? "",
      }
    case "ATTACHED":
      return { ...state, status: "running", processId: event.processId }
    case "PROMPT":
      return {
        ...state,
        status: "idle",
        cli: "PowerShell",
        resumeCommand: "",
      }
    case "ACTIVITY":
      return {
        ...state,
        status: "running",
        cli: event.cli,
        resumeCommand: event.resumeCommand ?? state.resumeCommand,
      }
    case "STOP":
      return { ...state, status: "stopping" }
    case "EXITED":
      return { ...state, status: "stopped", processId: null }
    case "FAILED":
      return {
        ...state,
        status: "failed",
        processId: null,
        error: event.error,
      }
  }
}
