import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.9)]",
        secondary:
          "bg-[hsl(var(--panel-elevated))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]",
        outline:
          "border border-[hsl(var(--border-strong))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--panel-elevated))]",
        ghost:
          "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--panel-elevated))]",
        danger:
          "bg-[hsl(var(--danger))] text-white hover:bg-[hsl(var(--danger)/0.9)]",
        link: "bg-transparent text-[hsl(var(--accent))] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        md: "h-9 rounded-[var(--radius-sm)] px-4 text-sm",
        lg: "h-11 rounded-[var(--radius-md)] px-6 text-sm",
        icon: "h-9 w-9 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
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
