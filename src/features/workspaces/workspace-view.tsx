import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Cpu,
  Folder,
  Bot,
  Terminal,
  GitBranch,
  Settings,
  Layers,
  Search,
  Palette,
  History,
} from "lucide-react"
import { Topbar, BottomBar } from "@/components/layout/bars"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarItem,
  SidebarFooter,
} from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CommandPalette,
  type CommandItem,
} from "@/components/ui/command-palette"
import { useTheme } from "@/lib/theme"
import { AgentPanel } from "@/features/agents/agent-panel"
import { TerminalPanel } from "@/features/terminal/terminal-panel"
import { SessionPanel } from "@/features/sessions/session-panel"
import { PanelsView } from "@/features/workspaces/panels-view"
import { GitPanel } from "@/features/git/git-panel"
import { SettingsPanel } from "@/features/settings/settings-panel"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { listAgents } from "@/lib/db"
import { listProcesses } from "@/lib/pty"
import type { Workspace, Agent } from "@/types"

interface WorkspaceViewProps {
  workspace: Workspace
  onBack: () => void
}

type ViewTab = "panels" | "agents" | "terminals" | "sessions" | "git" | "settings"

export function WorkspaceView({ workspace, onBack }: WorkspaceViewProps) {
  const { theme, themes, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<ViewTab>("agents")
  const [agents, setAgents] = useState<Agent[]>([])
  const [processCount, setProcessCount] = useState(0)
  const [gitBranch, setGitBranch] = useState("sem branch")
  const [paletteOpen, setPaletteOpen] = useState(false)

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
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "d") {
        e.preventDefault()
        setActiveTab("git")
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "s") {
        e.preventDefault()
        setActiveTab("settings")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "tab-agents",
        label: "Ver Agentes",
        icon: <Bot className="h-4 w-4" />,
        shortcut: "Ctrl+N",
        action: () => setActiveTab("agents"),
      },
      {
        id: "tab-terminals",
        label: "Abrir Terminais",
        icon: <Terminal className="h-4 w-4" />,
        shortcut: "Ctrl+T",
        action: () => setActiveTab("terminals"),
      },
      {
        id: "tab-sessions",
        label: "Ver Sessões",
        icon: <History className="h-4 w-4" />,
        action: () => setActiveTab("sessions"),
      },
      {
        id: "tab-git",
        label: "Ver Git Diff",
        icon: <GitBranch className="h-4 w-4" />,
        shortcut: "Ctrl+Shift+D",
        action: () => setActiveTab("git"),
      },
      {
        id: "tab-panels",
        label: "Multi-Painel",
        icon: <Layers className="h-4 w-4" />,
        action: () => setActiveTab("panels"),
      },
      {
        id: "tab-settings",
        label: "Abrir Configurações",
        icon: <Settings className="h-4 w-4" />,
        shortcut: "Ctrl+S",
        action: () => setActiveTab("settings"),
      },
      ...themes.map((t) => ({
        id: `theme-${t.id}`,
        label: `Tema: ${t.name}`,
        icon: <Palette className="h-4 w-4" />,
        action: () => setTheme(t.id),
      })),
      {
        id: "back",
        label: "Voltar para Workspaces",
        icon: <Folder className="h-4 w-4" />,
        action: onBack,
      },
    ],
    [themes, setTheme, onBack]
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <Folder className="h-4 w-4" />
          {workspace.name}
        </Button>
        <Badge variant="muted">{workspace.path}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer hover:bg-[hsl(var(--panel-elevated))] transition-colors"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            Buscar...
            <kbd className="rounded border border-[hsl(var(--border))] px-1 text-[10px]">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </Topbar>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="w-56">
          <SidebarHeader>
            <span className="text-sm font-semibold">Workspace</span>
          </SidebarHeader>
          <SidebarContent>
            <div className="space-y-1 p-2">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Geral
              </p>
              <SidebarItem
                active={activeTab === "panels"}
                onClick={() => setActiveTab("panels")}
              >
                <Layers className="h-4 w-4" />
                Painéis
              </SidebarItem>
              <SidebarItem
                active={activeTab === "agents"}
                onClick={() => setActiveTab("agents")}
              >
                <Bot className="h-4 w-4" />
                Agentes
              </SidebarItem>
              <SidebarItem
                active={activeTab === "terminals"}
                onClick={() => setActiveTab("terminals")}
              >
                <Terminal className="h-4 w-4" />
                Terminais
              </SidebarItem>
              <SidebarItem
                active={activeTab === "sessions"}
                onClick={() => setActiveTab("sessions")}
              >
                <History className="h-4 w-4" />
                Sessões
              </SidebarItem>
              <SidebarItem
                active={activeTab === "git"}
                onClick={() => setActiveTab("git")}
              >
                <GitBranch className="h-4 w-4" />
                Git
              </SidebarItem>
            </div>
            <div className="space-y-1 p-2">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Configurações
              </p>
              <SidebarItem
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="h-4 w-4" />
                Preferências
              </SidebarItem>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <ThemeSwitcher />
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-hidden bg-[hsl(var(--background))]">
          {activeTab === "agents" && (
            <AgentPanel
              workspaceId={workspace.id}
              workspacePath={workspace.path}
            />
          )}
          {activeTab === "panels" && (
            <PanelsView workspace={workspace} agents={agents} />
          )}
          {activeTab === "terminals" && (
            <TerminalPanel
              workspaceId={workspace.id}
              workspacePath={workspace.path}
              agents={agents}
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
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          {gitBranch}
        </span>
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3" />
          {processCount} processo{processCount !== 1 ? "s" : ""} ativo{processCount !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Palette className="h-3 w-3" />
          {theme.name}
        </span>
      </BottomBar>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
      />
    </div>
  )
}
