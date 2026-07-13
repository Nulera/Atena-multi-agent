import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Sidebar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--panel))]",
        className
      )}
      {...props}
    />
  )
)
Sidebar.displayName = "Sidebar"

function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-9 items-center px-3", className)}
      {...props}
    />
  )
}

function SidebarContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)} {...props} />
  )
}

function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarItem({
  className,
  active,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer",
        active
          ? "bg-[hsl(var(--accent)/0.08)] text-[hsl(var(--accent))]"
          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))]",
        className
      )}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    />
  )
}

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
}
