import type { AgentStatus } from "@/types"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import {
  Circle,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

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
    label: "Idle",
    variant: "muted",
    icon: <Circle className="h-3 w-3" />,
  },
  running: {
    label: "Running",
    variant: "accent",
    icon: <Play className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    variant: "warning",
    icon: <Pause className="h-3 w-3" />,
  },
  error: {
    label: "Error",
    variant: "danger",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  finished: {
    label: "Finished",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
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
