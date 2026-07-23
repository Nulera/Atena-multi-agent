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
    <Overlay className="fixed inset-0 z-50 bg-black/70" />
    <Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] border border-[hsl(var(--border-strong))] bg-[hsl(var(--panel))] p-4",
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-3 top-3 p-1 text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--foreground))] cursor-pointer">
        <X className="h-3.5 w-3.5" />
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
    <div className={cn("mb-3 flex flex-col gap-1", className)} {...props} />
  )
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-3 flex justify-end gap-1.5", className)}
      {...props}
    />
  )
}

const DialogTitle = forwardRef<
  React.ElementRef<typeof Title>,
  React.ComponentPropsWithoutRef<typeof Title>
>(({ className, ...props }, ref) => (
  <Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = forwardRef<
  React.ElementRef<typeof Description>,
  React.ComponentPropsWithoutRef<typeof Description>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn("text-[11px] text-[hsl(var(--muted))]", className)}
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
