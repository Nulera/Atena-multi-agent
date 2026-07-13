import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Topbar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-12 items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-4",
        className
      )}
      {...props}
    />
  )
)
Topbar.displayName = "Topbar"

const BottomBar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-7 items-center gap-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-4 text-xs text-[hsl(var(--muted-foreground))]",
        className
      )}
      {...props}
    />
  )
)
BottomBar.displayName = "BottomBar"

export { Topbar, BottomBar }
