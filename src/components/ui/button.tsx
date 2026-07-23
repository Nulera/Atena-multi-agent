import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none border",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-transparent hover:brightness-110",
        secondary:
          "bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--panel-elevated))] hover:border-[hsl(var(--muted))]",
        outline:
          "bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]",
        ghost:
          "bg-transparent text-[hsl(var(--muted-foreground))] border-transparent hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))]",
        danger:
          "bg-transparent text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.4)] hover:bg-[hsl(var(--danger)/0.1)]",
        link: "bg-transparent text-[hsl(var(--accent))] border-transparent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 rounded-[var(--radius-sm)] px-2.5 text-[11px]",
        md: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-9 rounded-[var(--radius-sm)] px-4 text-xs",
        icon: "h-7 w-7 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
