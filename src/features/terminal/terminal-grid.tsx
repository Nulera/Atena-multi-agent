import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Columns2,
  Grid2X2,
  Maximize2,
  Plus,
  Search,
  Terminal as TerminalIcon,
} from "lucide-react"
import {
  TerminalView,
  type TerminalActivity,
} from "@/features/terminal/terminal-view"
import { Button } from "@/components/ui/button"
import { getCliAppearance } from "@/features/terminal/terminal-cli"
import { getDefaultLayout, saveLayout } from "@/lib/db"

interface Pane {
  id: string
  label: string
  ordinal: number
  workingDir: string
  activity: TerminalActivity
  command?: string
}

export interface TerminalPaneSummary extends TerminalActivity {
  id: string
  label: string
}

interface TerminalGridProps {
  workspaceId: string
  workspacePath: string
  onPanesChange?: (panes: TerminalPaneSummary[]) => void
}

type LayoutMode = "auto" | "columns" | "grid"

interface PersistedTerminalLayout {
  version: 1
  mode: LayoutMode
  panes: Array<{
    label: string
    ordinal: number
    workingDir: string
    resumeCommand?: string
    cli?: string
  }>
}

function createPane(workspacePath: string, index: number): Pane {
  return {
    id: `pane-${Date.now()}-${index}`,
    label: "PowerShell",
    ordinal: index,
    workingDir: workspacePath,
    activity: { status: "open", cli: "PowerShell" },
  }
}

function restorePane(
  workspacePath: string,
  pane: PersistedTerminalLayout["panes"][number],
  index: number
): Pane {
  const cli = pane.cli || "PowerShell"
  return {
    id: `pane-${Date.now()}-${index}`,
    label: pane.label || getCliAppearance(cli).label,
    ordinal: pane.ordinal || index,
    workingDir: pane.workingDir || workspacePath,
    command: pane.resumeCommand,
    activity: {
      status: pane.resumeCommand ? "running" : "open",
      cli,
      resumeCommand: pane.resumeCommand,
    },
  }
}

export function TerminalGrid({
  workspaceId,
  workspacePath,
  onPanesChange,
}: TerminalGridProps) {
  const [panes, setPanes] = useState<Pane[]>(() => [
    createPane(workspacePath, 1),
  ])
  const [layout, setLayout] = useState<LayoutMode>("auto")
  const [layoutReady, setLayoutReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLayoutReady(false)

    getDefaultLayout(workspaceId)
      .then((saved) => {
        if (cancelled) return
        if (saved) {
          const parsed = JSON.parse(saved.layoutJson) as PersistedTerminalLayout
          if (parsed.version === 1 && Array.isArray(parsed.panes)) {
            setLayout(parsed.mode || "auto")
            setPanes(
              parsed.panes.map((pane, index) =>
                restorePane(workspacePath, pane, index + 1)
              )
            )
          }
        }
      })
      .catch((error) => {
        console.error("Failed to restore terminal layout:", error)
      })
      .finally(() => {
        if (!cancelled) setLayoutReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [workspaceId, workspacePath])

  useEffect(() => {
    if (!layoutReady) return
    const timer = window.setTimeout(() => {
      const persisted: PersistedTerminalLayout = {
        version: 1,
        mode: layout,
        panes: panes.map((pane) => ({
          label: pane.label,
          ordinal: pane.ordinal,
          workingDir: pane.workingDir,
          resumeCommand: pane.activity.resumeCommand,
          cli: pane.activity.cli,
        })),
      }
      saveLayout(
        workspaceId,
        "Terminal workspace",
        JSON.stringify(persisted),
        true
      ).catch((error) => {
        console.error("Failed to save terminal layout:", error)
      })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [layout, layoutReady, panes, workspaceId])

  const openPane = useCallback(() => {
    setPanes((current) => {
      const nextOrdinal =
        current.reduce((max, pane) => Math.max(max, pane.ordinal), 0) + 1
      return [...current, createPane(workspacePath, nextOrdinal)]
    })
  }, [workspacePath])

  const closePane = useCallback((id: string) => {
    setPanes((current) => current.filter((pane) => pane.id !== id))
  }, [])

  const updatePaneActivity = useCallback(
    (id: string, activity: TerminalActivity) => {
      setPanes((current) =>
        current.map((pane) =>
          pane.id === id &&
          (pane.activity.status !== activity.status ||
            pane.activity.cli !== activity.cli)
            ? {
                ...pane,
                label: getCliAppearance(activity.cli).label,
                activity,
              }
            : pane
        )
      )
    },
    []
  )

  useEffect(() => {
    onPanesChange?.(
      panes.map(({ id, label, activity }) => ({ id, label, ...activity }))
    )
  }, [panes, onPanesChange])

  const gridTemplateColumns = useMemo(() => {
    if (layout === "columns") {
      return `repeat(${Math.min(panes.length, 3)}, minmax(0, 1fr))`
    }
    if (layout === "grid") return "repeat(2, minmax(0, 1fr))"
    if (panes.length <= 1) return "minmax(0, 1fr)"
    if (panes.length <= 4) return "repeat(2, minmax(0, 1fr))"
    return "repeat(3, minmax(0, 1fr))"
  }, [layout, panes.length])

  return (
    <div className="flex h-full min-w-0 flex-col bg-[hsl(var(--background))]">
      <div className="flex h-8 shrink-0 items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-2">
        <div className="flex h-full items-center gap-2 border-r border-[hsl(var(--border))] pr-3">
          <TerminalIcon className="h-3 w-3 text-[hsl(var(--accent))]" />
          <span className="text-[10px] font-semibold uppercase text-[hsl(var(--foreground))]">
            terminal workspace
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
            {panes.length} active
          </span>
        </div>

        <div className="ml-2 flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          {(
            [
              ["auto", Maximize2, "Auto layout"],
              ["columns", Columns2, "Column layout"],
              ["grid", Grid2X2, "Grid layout"],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              className={`flex h-5 w-6 items-center justify-center border-r border-[hsl(var(--border))] last:border-r-0 ${
                layout === mode
                  ? "bg-[hsl(var(--panel-elevated))] text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
              onClick={() => setLayout(mode)}
              title={label}
            >
              <Icon className="h-3 w-3" />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ml-2 flex h-5 items-center gap-1 px-1.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))]"
          title="Search terminal output"
        >
          <Search className="h-3 w-3" />
          buffer
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 border border-[hsl(var(--border))] px-2 text-[9px] uppercase"
          onClick={openPane}
        >
          <Plus className="h-3 w-3" />
          terminal
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {panes.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--panel))]">
              <TerminalIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase">
                No active terminals
              </p>
              <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                Start a shell in {workspacePath}
              </p>
            </div>
            <Button variant="default" size="sm" onClick={openPane}>
              <Plus className="h-3 w-3" />
              New terminal
            </Button>
          </div>
        ) : (
          <div
            className="grid h-full min-h-0 gap-px bg-[hsl(var(--border))]"
            style={{
              gridTemplateColumns,
              gridAutoRows: "minmax(13rem, 1fr)",
            }}
          >
            {panes.map((pane) =>
              (() => {
                const cliAppearance = getCliAppearance(pane.activity.cli)
                const CliIcon = cliAppearance.icon
                return (
                  <div
                    key={pane.id}
                    className="min-h-52 min-w-0 overflow-hidden bg-[hsl(var(--panel))]"
                  >
                    <TerminalView
                      agentName={pane.label}
                      workingDir={pane.workingDir}
                      workspaceId={workspaceId}
                      command={pane.command}
                      onClose={() => closePane(pane.id)}
                      onActivityChange={(activity) =>
                        updatePaneActivity(pane.id, activity)
                      }
                      accentColor={cliAppearance.color}
                      cliIcon={<CliIcon className="h-3.5 w-3.5" />}
                    />
                  </div>
                )
              })()
            )}
          </div>
        )}
      </div>
    </div>
  )
}
