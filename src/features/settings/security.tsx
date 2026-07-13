import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { isDestructiveCommand, checkCommand } from "@/lib/security"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "danger"
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === "danger" && (
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--danger))]" />
            )}
            {variant === "default" && (
              <Shield className="h-5 w-5 text-[hsl(var(--accent))]" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "default"}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CommandGuardProps {
  command: string
  onApprove: () => void
  onDeny: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandGuard({
  command,
  onApprove,
  onDeny,
  open,
  onOpenChange,
}: CommandGuardProps) {
  const check = checkCommand(command)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--danger))]" />
            Comando Potencialmente Perigoso
          </DialogTitle>
          <DialogDescription>
            Este comando foi identificado como potencialmente destrutivo.
            Reveja antes de aprovar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Comando:</span>
              <Badge variant="danger">Risco Alto</Badge>
            </div>
            <code className="block font-mono text-xs text-[hsl(var(--foreground))] break-all">
              {command}
            </code>
          </div>
          {check.matchedPattern && (
            <p className="text-xs text-[hsl(var(--warning))]">
              Padrão detectado: <code className="font-mono">{check.matchedPattern}</code>
            </p>
          )}
          <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)] p-3">
            <Shield className="h-4 w-4 shrink-0 text-[hsl(var(--warning))] mt-0.5" />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Aprovar apenas se você confia na fonte e entende as consequências.
              Esta ação pode causar perda de dados.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { onDeny(); onOpenChange(false) }}>
            Negar
          </Button>
          <Button variant="danger" onClick={() => { onApprove(); onOpenChange(false) }}>
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { isDestructiveCommand }
