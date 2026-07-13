import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Topbar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-8 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-2",
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
        "flex h-5 items-center gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-2 text-[9px] text-[hsl(var(--muted-foreground))]",
        className
      )}
      {...props}
    />
  )
)
BottomBar.displayName = "BottomBar"

export { Topbar, BottomBar }
