import { useState, useCallback } from "react"
import { Terminal as TerminalIcon, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { TerminalView } from "./terminal-view"
import type { Agent } from "@/types"

interface TerminalPanelProps {
  workspaceId: string
  workspacePath: string
  agents: Agent[]
}

interface TerminalTab {
  id: string
  agent: Agent
}

export function TerminalPanel({ workspaceId, workspacePath, agents }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const openTerminal = useCallback((agent: Agent) => {
    const id = `${agent.id}-${Date.now()}`
    setTabs((prev) => [...prev, { id, agent }])
    setActiveTab(id)
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (activeTab === id) {
        setActiveTab(next.length > 0 ? next[next.length - 1].id : null)
      }
      return next
    })
  }, [activeTab])

  const activeTabData = tabs.find((t) => t.id === activeTab)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-[hsl(var(--border))] px-2 py-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1 text-xs cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-[hsl(var(--panel-elevated))] text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--panel-elevated))]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <TerminalIcon className="h-3 w-3" />
            {tab.agent.name}
            <button
              className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {agents.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            {agents.slice(0, 5).map((agent) => (
              <Button
                key={agent.id}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => openTerminal(agent)}
                title={`Abrir terminal para ${agent.name}`}
              >
                <Plus className="h-3 w-3" />
                {agent.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-2">
        {activeTabData ? (
          <TerminalView
            agentId={activeTabData.agent.id}
            agentName={activeTabData.agent.name}
            command={activeTabData.agent.command}
            workingDir={activeTabData.agent.workingDirectory || workspacePath}
            workspaceId={workspaceId}
          />
        ) : (
          <EmptyState
            icon={<TerminalIcon className="h-8 w-8" />}
            title="Nenhum terminal aberto"
            description="Selecione um agente acima para abrir um terminal"
          />
        )}
      </div>
    </div>
  )
}
