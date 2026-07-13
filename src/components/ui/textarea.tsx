import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
