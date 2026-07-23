import { forwardRef } from "react"
import { Root as ScrollAreaRoot, Viewport } from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = forwardRef<
  React.ElementRef<typeof Viewport>,
  React.ComponentPropsWithoutRef<typeof Viewport>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaRoot className={cn("relative overflow-hidden", className)}>
    <Viewport ref={ref} className="h-full w-full rounded-[inherit]" {...props}>
      {children}
    </Viewport>
  </ScrollAreaRoot>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
