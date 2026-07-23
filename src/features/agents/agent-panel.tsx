import { useState, useCallback, useEffect } from "react"
import { Bot, Plus, Pencil, Trash2, Copy, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgentCard } from "@/components/ui/agent-card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AgentDialog } from "./agent-dialog"
import { listAgents, createAgent, updateAgent, deleteAgent } from "@/lib/db"
import { useToast } from "@/components/ui/toast"
import type { Agent } from "@/types"

interface AgentPanelProps {
  workspaceId: string
  workspacePath: string
  onAgentClick?: (agent: Agent) => void
}

export function AgentPanel({
  workspaceId,
  workspacePath,
  onAgentClick,
}: AgentPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Agent | null>(null)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    try {
      const list = await listAgents(workspaceId)
      setAgents(list)
    } catch (err) {
      console.error("Failed to load agents:", err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = useCallback(
    async (data: {
      workspaceId: string
      name: string
      role: string
      description: string
      basePrompt: string
      command: string
      workingDirectory: string
    }) => {
      try {
        if (editingAgent) {
          await updateAgent(editingAgent.id, data)
          toast({ title: "agent updated", variant: "success" })
        } else {
          await createAgent(data)
          toast({
            title: "agent created",
            description: data.name,
            variant: "success",
          })
        }
        await refresh()
        setEditingAgent(null)
      } catch (err) {
        toast({ title: "error", description: String(err), variant: "danger" })
      }
    },
    [editingAgent, refresh, toast]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteAgent(deleteConfirm.id)
      toast({
        title: "agent deleted",
        description: deleteConfirm.name,
        variant: "default",
      })
      await refresh()
    } catch (err) {
      toast({ title: "error", description: String(err), variant: "danger" })
    } finally {
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, refresh, toast])

  const handleDuplicate = useCallback(
    async (agent: Agent) => {
      try {
        await createAgent({
          workspaceId: agent.workspaceId,
          name: `${agent.name}-copy`,
          role: agent.role,
          description: agent.description,
          basePrompt: agent.basePrompt,
          command: agent.command,
          workingDirectory: agent.workingDirectory,
        })
        toast({ title: "agent duplicated", variant: "success" })
        await refresh()
      } catch (err) {
        toast({ title: "error", description: String(err), variant: "danger" })
      }
    },
    [refresh, toast]
  )

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
          agents
        </span>
        <span className="text-[10px] text-[hsl(var(--muted))]">
          ({filtered.length})
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <Input
              placeholder="filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-6 w-32 pl-7 text-[11px]"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setEditingAgent(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            new
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="text-[11px] text-[hsl(var(--muted))]">loading...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Bot className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
            <div>
              <p className="text-xs">no agents</p>
              <p className="mt-0.5 text-[10px] text-[hsl(var(--muted))]">
                create agents for this workspace
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingAgent(null)
                setDialogOpen(true)
              }}
              className="mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              create agent
            </Button>
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agent) => (
              <div key={agent.id} className="group relative">
                <AgentCard
                  agent={agent}
                  onClick={() => onAgentClick?.(agent)}
                />
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingAgent(agent)
                      setDialogOpen(true)
                    }}
                    title="edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicate(agent)
                    }}
                    title="duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[hsl(var(--danger))]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(agent)
                    }}
                    title="delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        workspacePath={workspacePath}
        agent={editingAgent}
        onSave={handleSave}
      />

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>delete agent?</DialogTitle>
            <DialogDescription>
              "{deleteConfirm?.name}" will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(null)}
            >
              cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
