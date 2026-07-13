import { type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--panel)/0.5)] p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-[hsl(var(--muted-foreground))]">{icon}</div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          {title}
        </p>
        {description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
