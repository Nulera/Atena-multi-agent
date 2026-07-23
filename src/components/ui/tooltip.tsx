import { forwardRef } from "react"
import {
  Provider,
  Root,
  Trigger,
  Portal,
  Content,
} from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = Provider
const Tooltip = Root
const TooltipTrigger = Trigger

const TooltipContent = forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <Portal>
    <Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] shadow-md",
        className
      )}
      {...props}
    />
  </Portal>
))
TooltipContent.displayName = "TooltipContent"

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
