import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 py-1 text-sm text-[hsl(var(--foreground))] transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
