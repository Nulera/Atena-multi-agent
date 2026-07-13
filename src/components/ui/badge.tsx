import { type HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 border px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))]",
        accent:
          "border-[hsl(var(--accent)/0.3)] bg-transparent text-[hsl(var(--accent))]",
        success:
          "border-[hsl(var(--success)/0.3)] bg-transparent text-[hsl(var(--success))]",
        warning:
          "border-[hsl(var(--warning)/0.3)] bg-transparent text-[hsl(var(--warning))]",
        danger:
          "border-[hsl(var(--danger)/0.3)] bg-transparent text-[hsl(var(--danger))]",
        muted:
          "border-transparent bg-transparent text-[hsl(var(--muted))]",
        outline:
          "border-[hsl(var(--border-strong))] text-[hsl(var(--muted-foreground))]",
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
