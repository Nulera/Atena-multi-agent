import { Group, Panel, Separator } from "react-resizable-panels"
import { AgentPanel } from "@/features/agents/agent-panel"
import { TerminalPanel } from "@/features/terminal/terminal-panel"
import { SessionPanel } from "@/features/sessions/session-panel"
import { Save, Layout as LayoutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"
import { saveLayout } from "@/lib/db"
import { useToast } from "@/components/ui/toast"
import type { Workspace, Agent } from "@/types"

interface PanelsViewProps {
  workspace: Workspace
  agents: Agent[]
}

export function PanelsView({ workspace, agents }: PanelsViewProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const handleSaveLayout = useCallback(async () => {
    setSaving(true)
    try {
      const layoutData = JSON.stringify({
        type: "split",
        orientation: "horizontal",
        panels: ["agents", "terminals", "sessions"],
      })
      await saveLayout(workspace.id, "Default Layout", layoutData, true)
      toast({ title: "Layout salvo", variant: "success" })
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: String(err),
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }, [workspace.id, toast])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-1.5">
        <LayoutIcon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs font-medium">Multi-Painel</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs"
          onClick={handleSaveLayout}
          disabled={saving}
        >
          <Save className="h-3 w-3" />
          Salvar Layout
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" style={{ height: "100%" }}>
          <Panel defaultSize="30%" minSize="20%">
            <AgentPanel
              workspaceId={workspace.id}
              workspacePath={workspace.path}
            />
          </Panel>
          <Separator className="w-px bg-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-col-resize" />
          <Panel defaultSize="40%" minSize="25%">
            <TerminalPanel
              workspaceId={workspace.id}
              workspacePath={workspace.path}
              agents={agents}
            />
          </Panel>
          <Separator className="w-px bg-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors cursor-col-resize" />
          <Panel defaultSize="30%" minSize="20%">
            <SessionPanel workspaceId={workspace.id} agents={agents} />
          </Panel>
        </Group>
      </div>
    </div>
  )
}
