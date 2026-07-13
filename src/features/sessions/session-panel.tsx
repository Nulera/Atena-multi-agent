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
import { cn } from "@/lib/utils"
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
import type { Session, SessionLog, Agent } from "@/types"

interface SessionPanelProps {
  workspaceId: string
  agents: Agent[]
}

const statusStyles: Record<string, string> = {
  active: "text-[hsl(var(--accent))]",
  finished: "text-[hsl(var(--success))]",
  stopped: "text-[hsl(var(--warning))]",
  error: "text-[hsl(var(--danger))]",
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
      toast({ title: "session renamed", variant: "success" })
      await refresh()
    } catch (err) {
      toast({ title: "error", description: String(err), variant: "danger" })
    } finally {
      setRenameDialog(null)
    }
  }, [renameDialog, renameValue, refresh, toast])

  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return
    try {
      await deleteSession(deleteDialog.id)
      toast({ title: "session deleted", variant: "default" })
      if (selectedSession?.id === deleteDialog.id) {
        setSelectedSession(null)
        setLogs([])
      }
      await refresh()
    } catch (err) {
      toast({ title: "error", description: String(err), variant: "danger" })
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
      <div className="flex w-64 flex-col border-r border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-2.5 py-1.5">
          <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            sessions
          </span>
          <span className="text-[10px] text-[hsl(var(--muted))]">({filtered.length})</span>
          <div className="ml-auto relative">
            <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <Input
              placeholder="filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-5 w-24 pl-6 text-[10px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-2.5 text-[11px] text-[hsl(var(--muted))]">loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 p-4 text-center">
              <History className="h-5 w-5 text-[hsl(var(--muted))] opacity-40" />
              <p className="text-[11px]">no sessions</p>
              <p className="text-[10px] text-[hsl(var(--muted))]">
                sessions are created when agents run
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {filtered.map((session) => {
                const agent = agentMap.get(session.agentId)
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex cursor-pointer flex-col gap-0.5 px-2 py-1.5 transition-colors",
                      selectedSession?.id === session.id
                        ? "bg-[hsl(var(--accent)/0.08)]"
                        : "hover:bg-[hsl(var(--panel-elevated))]"
                    )}
                    onClick={() => handleSelect(session)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-medium">
                        {session.name || `session-${session.id.slice(0, 6)}`}
                      </span>
                      <span className={cn("ml-auto text-[9px] uppercase", statusStyles[session.status] ?? "text-[hsl(var(--muted))]")}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[hsl(var(--muted))]">
                        {agent?.name ?? "unknown"}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] text-[hsl(var(--muted))]">
                        <Clock className="h-2 w-2" />
                        {new Date(session.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="cursor-pointer p-0 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenameDialog(session)
                          setRenameValue(session.name)
                        }}
                        title="rename"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        className="cursor-pointer p-0 text-[hsl(var(--muted))] hover:text-[hsl(var(--danger))]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteDialog(session)
                        }}
                        title="delete"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedSession ? (
          <>
            <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-2.5 py-1.5">
              <span className="text-[11px] font-medium">
                {selectedSession.name || `session-${selectedSession.id.slice(0, 6)}`}
              </span>
              <span className="text-[10px] text-[hsl(var(--muted))]">
                {new Date(selectedSession.startedAt).toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 text-[10px]"
                onClick={() => {
                  const text = logs.map((l) => `[${l.type}] ${l.content}`).join("\n")
                  navigator.clipboard.writeText(text)
                  toast({ title: "logs copied", variant: "success" })
                }}
              >
                copy
              </Button>
            </div>
            <div className="flex-1 overflow-hidden p-1.5">
              <LogViewer logs={logs.map(formatLog)} className="h-full" />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <History className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
            <p className="text-xs">select a session</p>
            <p className="text-[10px] text-[hsl(var(--muted))]">choose one from the left to view logs</p>
          </div>
        )}
      </div>

      <Dialog open={!!renameDialog} onOpenChange={(o) => !o && setRenameDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>rename session</DialogTitle>
            <DialogDescription>give this session a name</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="session name"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameDialog(null)}>cancel</Button>
            <Button variant="default" size="sm" onClick={handleRename} disabled={!renameValue.trim}>save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>delete session?</DialogTitle>
            <DialogDescription>logs will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteDialog(null)}>cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
