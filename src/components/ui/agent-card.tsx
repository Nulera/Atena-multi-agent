import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Bot } from "lucide-react"
import type { Agent } from "@/types"

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  className?: string
}

const roleLabels: Record<string, string> = {
  frontend: "frontend",
  backend: "backend",
  "ui-ux": "ui/ux",
  qa: "qa",
  copywriter: "copy",
  devops: "devops",
  "git-reviewer": "git-review",
  "project-manager": "pm",
  orchestrator: "orchestrator",
  custom: "custom",
}

export function AgentCard({ agent, onClick, className }: AgentCardProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer p-2.5 transition-colors hover:border-[hsl(var(--accent)/0.4)]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-medium">{agent.name}</p>
            <span className="text-[10px] text-[hsl(var(--muted))]">
              {roleLabels[agent.role] ?? agent.role}
            </span>
          </div>
          {agent.description && (
            <p className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted))]">
              {agent.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <StatusBadge status={agent.status} />
            {agent.command && (
              <code className="text-[10px] text-[hsl(var(--muted))]">
                ${agent.command}
              </code>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
