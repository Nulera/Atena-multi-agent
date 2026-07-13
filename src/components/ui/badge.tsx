import { type HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--panel-elevated))] text-[hsl(var(--foreground))]",
        accent:
          "border-transparent bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]",
        success:
          "border-transparent bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
        warning:
          "border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
        danger:
          "border-transparent bg-[hsl(var(--danger)/0.15)] text-[hsl(var(--danger))]",
        muted:
          "border-transparent bg-[hsl(var(--muted)/0.15)] text-[hsl(var(--muted-foreground))]",
        outline:
          "border-[hsl(var(--border-strong))] text-[hsl(var(--foreground))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
