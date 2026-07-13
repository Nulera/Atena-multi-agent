import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Bot, MoreVertical } from "lucide-react"
import type { Agent } from "@/types"

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  className?: string
}

const roleLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  "ui-ux": "UI/UX",
  qa: "QA",
  copywriter: "Copywriter",
  devops: "DevOps",
  "git-reviewer": "Git Reviewer",
  "project-manager": "Project Manager",
  orchestrator: "Orchestrator",
  custom: "Custom",
}

export function AgentCard({ agent, onClick, className }: AgentCardProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer p-4 transition-colors hover:border-[hsl(var(--accent)/0.5)]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--panel-elevated))]">
            <Bot className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <p className="text-sm font-medium">{agent.name}</p>
            <Badge variant="muted" className="mt-0.5">
              {roleLabels[agent.role] ?? agent.role}
            </Badge>
          </div>
        </div>
        <button
          className="text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      {agent.description && (
        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          {agent.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={agent.status} />
        {agent.command && (
          <code className="rounded-[var(--radius-sm)] bg-[hsl(var(--panel-elevated))] px-2 py-0.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">
            {agent.command}
          </code>
        )}
      </div>
    </Card>
  )
}
