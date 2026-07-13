import {
  forwardRef,
  type SelectHTMLAttributes,
} from "react"
import { cn } from "@/lib/utils"

const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 py-1 text-sm text-[hsl(var(--foreground))] transition-colors focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = "Select"

export { Select }
