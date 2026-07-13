import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] transition-colors placeholder:text-[hsl(var(--muted))] focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-40 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
