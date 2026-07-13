import { forwardRef } from "react"
import {
  Close,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
} from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = Root
const DialogTrigger = Trigger
const DialogClose = Close

const DialogContent = forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, children, ...props }, ref) => (
  <Portal>
    <Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-6 shadow-xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))] cursor-pointer">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogClose>
    </Content>
  </Portal>
))
DialogContent.displayName = "DialogContent"

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
  )
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />
  )
}

const DialogTitle = forwardRef<
  React.ElementRef<typeof Title>,
  React.ComponentPropsWithoutRef<typeof Title>
>(({ className, ...props }, ref) => (
  <Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = forwardRef<
  React.ElementRef<typeof Description>,
  React.ComponentPropsWithoutRef<typeof Description>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
