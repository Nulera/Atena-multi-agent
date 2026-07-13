import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Cpu,
  Folder,
  Bot,
  Terminal,
  GitBranch,
  Settings,
  History,
  Search,
  ChevronRight,
  CircleDot,
} from "lucide-react"
import { Topbar, BottomBar } from "@/components/layout/bars"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarItem,
  SidebarFooter,
} from "@/components/layout/sidebar"
import {
  CommandPalette,
  type CommandItem,
} from "@/components/ui/command-palette"
import { useTheme } from "@/lib/theme"
import { AgentPanel } from "@/features/agents/agent-panel"
import { OrchestratorPanel } from "@/features/agents/orchestrator-panel"
import {
  TerminalGrid,
  type TerminalPaneSummary,
} from "@/features/terminal/terminal-grid"
import { SessionPanel } from "@/features/sessions/session-panel"
import { GitPanel } from "@/features/git/git-panel"
import { SettingsPanel } from "@/features/settings/settings-panel"
import { listAgents } from "@/lib/db"
import { listProcesses } from "@/lib/pty"
import type { Workspace, Agent } from "@/types"
import { getCliAppearance } from "@/features/terminal/terminal-cli"

interface WorkspaceViewProps {
  workspace: Workspace
  onBack: () => void
}

type ViewTab =
  | "orchestrator"
  | "agents"
  | "terminals"
  | "sessions"
  | "git"
  | "settings"

export function WorkspaceView({ workspace, onBack }: WorkspaceViewProps) {
  const { theme, themes, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<ViewTab>("terminals")
  const [agents, setAgents] = useState<Agent[]>([])
  const [processCount, setProcessCount] = useState(0)
  const [gitBranch, setGitBranch] = useState("--")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [terminalPanes, setTerminalPanes] = useState<TerminalPaneSummary[]>([])

  const refreshAgents = useCallback(async () => {
    try {
      const list = await listAgents(workspace.id)
      setAgents(list)
    } catch (err) {
      console.error("Failed to load agents:", err)
    }
  }, [workspace.id])

  const refreshProcessCount = useCallback(async () => {
    try {
      const procs = await listProcesses()
      setProcessCount(procs.length)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshAgents()
    refreshProcessCount()
    const interval = setInterval(refreshProcessCount, 2000)
    return () => clearInterval(interval)
  }, [refreshAgents, refreshProcessCount])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        setActiveTab("agents")
      } else if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault()
        setActiveTab("terminals")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "tab-terminals",
        label: "terminals (grid)",
        icon: <Terminal className="h-3.5 w-3.5" />,
        shortcut: "^T",
        action: () => setActiveTab("terminals"),
      },
      {
        id: "tab-orchestrator",
        label: "orchestrator",
        icon: <Cpu className="h-3.5 w-3.5" />,
        action: () => setActiveTab("orchestrator"),
      },
      {
        id: "tab-agents",
        label: "agents",
        icon: <Bot className="h-3.5 w-3.5" />,
        shortcut: "^N",
        action: () => setActiveTab("agents"),
      },
      {
        id: "tab-sessions",
        label: "sessions",
        icon: <History className="h-3.5 w-3.5" />,
        action: () => setActiveTab("sessions"),
      },
      {
        id: "tab-git",
        label: "git diff",
        icon: <GitBranch className="h-3.5 w-3.5" />,
        action: () => setActiveTab("git"),
      },
      {
        id: "tab-settings",
        label: "settings",
        icon: <Settings className="h-3.5 w-3.5" />,
        action: () => setActiveTab("settings"),
      },
      ...themes.map((t) => ({
        id: `theme-${t.id}`,
        label: `theme: ${t.name}`,
        action: () => setTheme(t.id),
      })),
      {
        id: "back",
        label: "back to workspaces",
        icon: <Folder className="h-3.5 w-3.5" />,
        action: onBack,
      },
    ],
    [themes, setTheme, onBack]
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[hsl(var(--background))]">
      <Topbar>
        <button
          type="button"
          className="-ml-2 flex h-8 w-52 shrink-0 items-center gap-2 border-r border-[hsl(var(--border))] px-2 hover:bg-[hsl(var(--panel-elevated))]"
          onClick={onBack}
          title="Back to workspaces"
        >
          <span className="flex h-4 w-4 items-center justify-center border border-[hsl(var(--border-strong))] bg-[hsl(var(--foreground))] text-[8px] font-bold text-[hsl(var(--background))]">
            A
          </span>
          <span className="text-[10px] font-semibold tracking-[0.14em]">ATENA</span>
        </button>
        <div className="flex min-w-0 items-center gap-1.5 px-1 text-[10px]">
          <Folder className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
          <span className="truncate font-medium">{workspace.name}</span>
          <ChevronRight className="h-3 w-3 text-[hsl(var(--muted))]" />
          <span className="hidden truncate text-[9px] text-[hsl(var(--muted-foreground))] xl:block">
            {workspace.path}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[9px] text-[hsl(var(--muted-foreground))] md:flex">
            <CircleDot className="h-3 w-3 text-[hsl(var(--success))]" />
            local runtime
          </span>
          <button
            className="flex h-6 items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-[9px] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))]"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-3 w-3" />
            <span className="hidden sm:inline">command</span>
            <kbd className="text-[9px]">^K</kbd>
          </button>
        </div>
      </Topbar>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="w-52 shrink-0">
          <SidebarHeader>
            <div className="flex w-full items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                project
              </span>
              <span className="ml-auto h-1.5 w-1.5 bg-[hsl(var(--success))]" title="Workspace online" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="border-b border-[hsl(var(--border))] px-2 py-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => setActiveTab("terminals")}
              >
                <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                <Folder className="h-3 w-3 text-[hsl(var(--warning))]" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-medium">
                  {workspace.name}
                </span>
                <span className="text-[8px] text-[hsl(var(--muted-foreground))]">OPEN</span>
              </button>
            </div>
            <p className="px-3 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              tools
            </p>
            <div className="space-y-0.5 p-1.5">
              <SidebarItem
                active={activeTab === "terminals"}
                onClick={() => setActiveTab("terminals")}
              >
                <Terminal className="h-3.5 w-3.5" />
                terminals
              </SidebarItem>
              {terminalPanes.length > 0 && (
                <div className="ml-5 border-l border-[hsl(var(--border))] pl-1.5">
                  {terminalPanes.map((pane) => {
                    const cliAppearance = getCliAppearance(pane.cli)
                    const CliIcon = cliAppearance.icon
                    const statusColor =
                      pane.status === "running"
                        ? "bg-[hsl(var(--success))]"
                        : pane.status === "stopped"
                          ? "bg-[hsl(var(--danger))]"
                          : pane.status === "idle"
                            ? "bg-[hsl(var(--warning))]"
                            : "bg-[hsl(var(--accent))]"
                    return (
                      <button
                        key={pane.id}
                        type="button"
                        className="group my-0.5 flex w-full min-w-0 items-center gap-1.5 px-1.5 py-1 text-left hover:bg-[hsl(var(--panel-elevated))]"
                        onClick={() => setActiveTab("terminals")}
                        title={`${pane.label}: ${pane.status} - ${pane.cli}`}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/15"
                          style={{ backgroundColor: cliAppearance.color }}
                          title={`${cliAppearance.label} CLI`}
                        >
                          <CliIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[9px]"
                            style={{ color: cliAppearance.color }}
                          >
                            {pane.label}
                          </span>
                          <span className="flex min-w-0 items-center gap-1 text-[8px] uppercase text-[hsl(var(--muted-foreground))]">
                            <span>{pane.status}</span>
                            <span className="text-[hsl(var(--muted))]">/</span>
                            <span className="truncate normal-case">{pane.cli}</span>
                          </span>
                        </span>
                        <span
                          className={`h-1.5 w-1.5 shrink-0 ${statusColor}`}
                          title={pane.status}
                        />
                      </button>
                    )
                  })}
                </div>
              )}
              <SidebarItem
                active={activeTab === "orchestrator"}
                onClick={() => setActiveTab("orchestrator")}
              >
                <Cpu className="h-3.5 w-3.5" />
                orchestrator
              </SidebarItem>
              <SidebarItem
                active={activeTab === "agents"}
                onClick={() => setActiveTab("agents")}
              >
                <Bot className="h-3.5 w-3.5" />
                agents
              </SidebarItem>
              <SidebarItem
                active={activeTab === "sessions"}
                onClick={() => setActiveTab("sessions")}
              >
                <History className="h-3.5 w-3.5" />
                sessions
              </SidebarItem>
              <SidebarItem
                active={activeTab === "git"}
                onClick={() => setActiveTab("git")}
              >
                <GitBranch className="h-3.5 w-3.5" />
                git
              </SidebarItem>
            </div>
            <div className="space-y-0.5 p-1.5">
              <p className="px-3 pb-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                config
              </p>
              <SidebarItem
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="h-3.5 w-3.5" />
                settings
              </SidebarItem>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <select
              value={theme.id}
              onChange={(e) => setTheme(e.target.value as typeof theme.id)}
              className="h-6 w-full border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] px-1.5 text-[10px] text-[hsl(var(--muted-foreground))] cursor-pointer"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </SidebarFooter>
        </Sidebar>

        <main className="relative min-w-0 flex-1 overflow-hidden bg-[hsl(var(--background))]">
          <div
            className={`absolute inset-0 ${
              activeTab === "terminals"
                ? "visible"
                : "invisible pointer-events-none"
            }`}
            aria-hidden={activeTab !== "terminals"}
          >
            <TerminalGrid
              workspaceId={workspace.id}
              workspacePath={workspace.path}
              onPanesChange={setTerminalPanes}
            />
          </div>
          {activeTab === "orchestrator" && (
            <OrchestratorPanel workspacePath={workspace.path} />
          )}
          {activeTab === "agents" && (
            <AgentPanel
              workspaceId={workspace.id}
              workspacePath={workspace.path}
            />
          )}
          {activeTab === "sessions" && (
            <SessionPanel workspaceId={workspace.id} agents={agents} />
          )}
          {activeTab === "git" && (
            <GitPanel
              workspacePath={workspace.path}
              onBranchChange={setGitBranch}
            />
          )}
          {activeTab === "settings" && <SettingsPanel />}
        </main>
      </div>

      <BottomBar>
        <span className="flex items-center gap-1 text-[hsl(var(--success))]">
          <span className="h-1.5 w-1.5 bg-current" />
          ready
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="h-2.5 w-2.5" />
          {gitBranch}
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="h-2.5 w-2.5" />
          {processCount} proc{processCount !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto">{theme.name}</span>
      </BottomBar>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
      />
    </div>
  )
}
