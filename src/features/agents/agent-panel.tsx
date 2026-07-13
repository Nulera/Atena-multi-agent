import { useState, useCallback, useEffect } from "react"
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgentCard } from "@/components/ui/agent-card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AgentDialog } from "./agent-dialog"
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
} from "@/lib/db"
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
          toast({
            title: "Agente atualizado",
            variant: "success",
          })
        } else {
          await createAgent(data)
          toast({
            title: "Agente criado",
            description: data.name,
            variant: "success",
          })
        }
        await refresh()
        setEditingAgent(null)
      } catch (err) {
        toast({
          title: "Erro",
          description: String(err),
          variant: "danger",
        })
      }
    },
    [editingAgent, refresh, toast]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteAgent(deleteConfirm.id)
      toast({
        title: "Agente excluído",
        description: deleteConfirm.name,
        variant: "default",
      })
      await refresh()
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: String(err),
        variant: "danger",
      })
    } finally {
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, refresh, toast])

  const handleDuplicate = useCallback(
    async (agent: Agent) => {
      try {
        await createAgent({
          workspaceId: agent.workspaceId,
          name: `${agent.name} (cópia)`,
          role: agent.role,
          description: agent.description,
          basePrompt: agent.basePrompt,
          command: agent.command,
          workingDirectory: agent.workingDirectory,
        })
        toast({
          title: "Agente duplicado",
          variant: "success",
        })
        await refresh()
      } catch (err) {
        toast({
          title: "Erro ao duplicar",
          description: String(err),
          variant: "danger",
        })
      }
    },
    [refresh, toast]
  )

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Buscar agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingAgent(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bot className="h-8 w-8" />}
            title="Nenhum agente"
            description="Crie agentes especializados para este workspace"
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditingAgent(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Criar Agente
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agent) => (
              <div key={agent.id} className="group relative">
                <AgentCard agent={agent} onClick={() => onAgentClick?.(agent)} />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-[hsl(var(--panel))]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingAgent(agent)
                      setDialogOpen(true)
                    }}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-[hsl(var(--panel))]"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicate(agent)
                    }}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-[hsl(var(--panel))] text-[hsl(var(--danger))]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(agent)
                    }}
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir agente?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.name}"? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
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
