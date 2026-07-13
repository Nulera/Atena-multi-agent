import { useState, useCallback } from "react"
import { Terminal as TerminalIcon, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      <div className="flex items-center gap-0.5 border-b border-[hsl(var(--border))] px-1.5 py-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-2 py-1 text-[11px] cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-[hsl(var(--panel-elevated))] text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted))] hover:text-[hsl(var(--muted-foreground))]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <TerminalIcon className="h-2.5 w-2.5" />
            {tab.agent.name}
            <button
              className="opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {agents.length > 0 && (
          <div className="ml-auto flex items-center gap-0.5">
            {agents.slice(0, 5).map((agent) => (
              <Button
                key={agent.id}
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => openTerminal(agent)}
                title={`open terminal: ${agent.name}`}
              >
                <Plus className="h-2.5 w-2.5" />
                {agent.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-1.5">
        {activeTabData ? (
          <TerminalView
            agentId={activeTabData.agent.id}
            agentName={activeTabData.agent.name}
            command={activeTabData.agent.command}
            workingDir={activeTabData.agent.workingDirectory || workspacePath}
            workspaceId={workspaceId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <TerminalIcon className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
            <div>
              <p className="text-xs">no terminal open</p>
              <p className="mt-0.5 text-[10px] text-[hsl(var(--muted))]">
                select an agent above to start
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
