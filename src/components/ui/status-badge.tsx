import type { AgentStatus } from "@/types"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Circle, Play, Pause, AlertCircle, CheckCircle2 } from "lucide-react"

interface StatusBadgeProps {
  status: AgentStatus
  className?: string
}

const statusConfig: Record<
  AgentStatus,
  {
    label: string
    variant: BadgeProps["variant"]
    icon: React.ReactNode
  }
> = {
  idle: {
    label: "idle",
    variant: "muted",
    icon: <Circle className="h-2.5 w-2.5" />,
  },
  running: {
    label: "running",
    variant: "accent",
    icon: <Play className="h-2.5 w-2.5" />,
  },
  paused: {
    label: "paused",
    variant: "warning",
    icon: <Pause className="h-2.5 w-2.5" />,
  },
  error: {
    label: "error",
    variant: "danger",
    icon: <AlertCircle className="h-2.5 w-2.5" />,
  },
  finished: {
    label: "done",
    variant: "success",
    icon: <CheckCircle2 className="h-2.5 w-2.5" />,
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.icon}
      {config.label}
    </Badge>
  )
}
