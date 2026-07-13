import { useState, useCallback, useEffect } from "react"
import {
  History,
  Search,
  Trash2,
  Pencil,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { LogViewer } from "@/components/ui/log-viewer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  listSessions,
  updateSession,
  deleteSession,
  listSessionLogs,
} from "@/lib/db"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { Session, SessionLog, Agent } from "@/types"

interface SessionPanelProps {
  workspaceId: string
  agents: Agent[]
}

const statusConfig: Record<string, { label: string; variant: "accent" | "success" | "danger" | "muted" | "warning" }> = {
  active: { label: "Active", variant: "accent" },
  finished: { label: "Finished", variant: "success" },
  stopped: { label: "Stopped", variant: "warning" },
  error: { label: "Error", variant: "danger" },
}

export function SessionPanel({ workspaceId, agents }: SessionPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [renameDialog, setRenameDialog] = useState<Session | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Session | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    try {
      const list = await listSessions(workspaceId)
      setSessions(list)
    } catch (err) {
      console.error("Failed to load sessions:", err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadLogs = useCallback(async (sessionId: string) => {
    try {
      const l = await listSessionLogs(sessionId)
      setLogs(l)
    } catch (err) {
      console.error("Failed to load logs:", err)
      setLogs([])
    }
  }, [])

  const handleSelect = useCallback(
    (session: Session) => {
      setSelectedSession(session)
      loadLogs(session.id)
    },
    [loadLogs]
  )

  const handleRename = useCallback(async () => {
    if (!renameDialog || !renameValue.trim()) return
    try {
      await updateSession(renameDialog.id, { name: renameValue.trim() })
      toast({ title: "Sessão renomeada", variant: "success" })
      await refresh()
    } catch (err) {
      toast({ title: "Erro", description: String(err), variant: "danger" })
    } finally {
      setRenameDialog(null)
    }
  }, [renameDialog, renameValue, refresh, toast])

  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return
    try {
      await deleteSession(deleteDialog.id)
      toast({ title: "Sessão excluída", variant: "default" })
      if (selectedSession?.id === deleteDialog.id) {
        setSelectedSession(null)
        setLogs([])
      }
      await refresh()
    } catch (err) {
      toast({ title: "Erro", description: String(err), variant: "danger" })
    } finally {
      setDeleteDialog(null)
    }
  }, [deleteDialog, selectedSession, refresh, toast])

  const agentMap = new Map(agents.map((a) => [a.id, a]))

  const filtered = sessions.filter((s) => {
    const agent = agentMap.get(s.agentId)
    const text = `${s.name} ${agent?.name ?? ""}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const formatLog = (log: SessionLog) => ({
    type: log.type as "command" | "output" | "error" | "info",
    content: log.content,
    timestamp: log.createdAt,
  })

  return (
    <div className="flex h-full">
      <div className="flex w-72 flex-col border-r border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 p-3 border-b border-[hsl(var(--border))]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Buscar sessão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title="Sem sessões"
                description="As sessões são criadas ao executar agentes"
                className="p-4"
              />
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filtered.map((session) => {
                const agent = agentMap.get(session.agentId)
                const status = statusConfig[session.status] ?? {
                  label: session.status,
                  variant: "muted" as const,
                }
                return (
                  <Card
                    key={session.id}
                    className={cn(
                      "group cursor-pointer p-3 transition-colors",
                      selectedSession?.id === session.id
                        ? "border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.05)]"
                        : "hover:border-[hsl(var(--border-strong))]"
                    )}
                    onClick={() => handleSelect(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {session.name || `Sessão ${session.id.slice(0, 8)}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
                          {agent?.name ?? "Agente desconhecido"}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="ml-1 shrink-0 text-[10px]">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(session.startedAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          className="cursor-pointer p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenameDialog(session)
                            setRenameValue(session.name)
                          }}
                          title="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="cursor-pointer p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteDialog(session)
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedSession ? (
          <>
            <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] p-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedSession.name || `Sessão ${selectedSession.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Iniciada: {new Date(selectedSession.startedAt).toLocaleString()}
                  {selectedSession.endedAt && (
                    <> | Encerrada: {new Date(selectedSession.endedAt).toLocaleString()}</>
                  )}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = logs.map((l) => `[${l.type}] ${l.content}`).join("\n")
                    navigator.clipboard.writeText(text)
                    toast({ title: "Logs copiados", variant: "success" })
                  }}
                >
                  Copiar Logs
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <LogViewer logs={logs.map(formatLog)} className="h-full" />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="Selecione uma sessão"
              description="Escolha uma sessão à esquerda para ver os logs"
            />
          </div>
        )}
      </div>

      <Dialog open={!!renameDialog} onOpenChange={(o) => !o && setRenameDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear sessão</DialogTitle>
            <DialogDescription>Dê um nome para esta sessão</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nome da sessão"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir sessão?</DialogTitle>
            <DialogDescription>
              Os logs desta sessão serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
