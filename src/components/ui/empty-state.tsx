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
        "flex flex-col items-center justify-center gap-2 p-6 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-[hsl(var(--muted))] opacity-50">{icon}</div>
      )}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-[hsl(var(--foreground))]">
          {title}
        </p>
        {description && (
          <p className="text-[11px] text-[hsl(var(--muted))]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
