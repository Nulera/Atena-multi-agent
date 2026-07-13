import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "warning" | "danger"

interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  const icons: Record<ToastVariant, ReactNode> = {
    default: <Info className="h-4 w-4 text-[hsl(var(--accent))]" />,
    success: (
      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
    ),
    warning: (
      <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
    ),
    danger: <AlertCircle className="h-4 w-4 text-[hsl(var(--danger))]" />,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] p-4 shadow-lg min-w-[300px] max-w-[400px]"
            )}
          >
            {icons[t.variant]}
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de ToastProvider")
  }
  return ctx
}
