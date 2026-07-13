import { forwardRef } from "react"
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = Root

const TabsList = forwardRef<
  React.ElementRef<typeof List>,
  React.ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => (
  <List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-1",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = forwardRef<
  React.ElementRef<typeof Trigger>,
  React.ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
  <Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-all focus-visible:outline-none data-[state=active]:bg-[hsl(var(--panel-elevated))] data-[state=active]:text-[hsl(var(--foreground))] cursor-pointer select-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
  <Content
    ref={ref}
    className={cn("mt-2 focus-visible:outline-none", className)}
    {...props}
  />
))
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
