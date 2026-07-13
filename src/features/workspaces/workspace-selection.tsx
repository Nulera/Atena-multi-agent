import { useState } from "react"
import {
  FolderPlus,
  FolderOpen,
  Search,
  Cpu,
  Trash2,
  Settings,
  PanelsTopLeft,
  FolderInput,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { validatePath, pickFolder } from "@/lib/db"
import type { Workspace } from "@/types"

interface WorkspaceSelectionProps {
  workspaces: Workspace[]
  onCreate: (name: string, path: string, description: string) => void
  onOpen: (workspace: Workspace) => void
  onRemove: (id: string) => void
}

export function WorkspaceSelection({
  workspaces,
  onCreate,
  onOpen,
  onRemove,
}: WorkspaceSelectionProps) {
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [description, setDescription] = useState("")
  const [pathValid, setPathValid] = useState<boolean | null>(null)
  const [pathChecking, setPathChecking] = useState(false)

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handlePickFolder() {
    const picked = await pickFolder()
    if (picked) {
      setPath(picked)
      await checkPath(picked)
    }
  }

  async function checkPath(p: string) {
    if (!p.trim()) {
      setPathValid(null)
      return
    }
    setPathChecking(true)
    try {
      const valid = await validatePath(p)
      setPathValid(valid)
    } catch {
      setPathValid(false)
    } finally {
      setPathChecking(false)
    }
  }

  function handleCreate() {
    if (!name.trim() || !path.trim() || !pathValid) return
    onCreate(name.trim(), path.trim(), description.trim())
    setName("")
    setPath("")
    setDescription("")
    setPathValid(null)
    setShowCreate(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-[hsl(var(--accent))]" />
          <span className="text-lg font-semibold tracking-tight">Atena</span>
          <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
            Local-First Multi-Agent Control Center
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Selecione um Workspace
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Organize seus projetos, agentes e sessões localmente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Buscar workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowCreate(!showCreate)}>
              <FolderPlus className="h-4 w-4" />
              Novo Workspace
            </Button>
          </div>

          {showCreate && (
            <Card className="space-y-3 p-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  Nome
                </label>
                <Input
                  placeholder="Meu Projeto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  Caminho da pasta local
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="C:\projetos\meu-projeto"
                    value={path}
                    onChange={(e) => {
                      setPath(e.target.value)
                      checkPath(e.target.value)
                    }}
                    className={cn(
                      pathValid === false &&
                        "border-[hsl(var(--danger))]",
                      pathValid === true &&
                        "border-[hsl(var(--success))]"
                    )}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePickFolder}
                    title="Selecionar pasta"
                  >
                    <FolderInput className="h-4 w-4" />
                  </Button>
                </div>
                {pathChecking && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Verificando...
                  </p>
                )}
                {pathValid === true && (
                  <p className="flex items-center gap-1 text-xs text-[hsl(var(--success))]">
                    <CheckCircle2 className="h-3 w-3" />
                    Pasta válida
                  </p>
                )}
                {pathValid === false && (
                  <p className="flex items-center gap-1 text-xs text-[hsl(var(--danger))]">
                    <AlertCircle className="h-3 w-3" />
                    Pasta não encontrada
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  Descrição (opcional)
                </label>
                <Input
                  placeholder="Breve descrição do workspace"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || !path.trim() || !pathValid}
                >
                  Criar
                </Button>
              </div>
            </Card>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<PanelsTopLeft className="h-8 w-8" />}
              title="Nenhum workspace encontrado"
              description="Crie seu primeiro workspace para começar a usar o Atena"
              action={
                !showCreate && (
                  <Button onClick={() => setShowCreate(true)}>
                    <FolderPlus className="h-4 w-4" />
                    Criar Workspace
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((workspace) => (
                <Card
                  key={workspace.id}
                  className={cn(
                    "group cursor-pointer p-4 transition-colors hover:border-[hsl(var(--accent)/0.5)]"
                  )}
                  onClick={() => onOpen(workspace)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--panel-elevated))]">
                        <FolderOpen className="h-5 w-5 text-[hsl(var(--accent))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{workspace.name}</p>
                        <p className="max-w-[200px] truncate text-xs text-[hsl(var(--muted-foreground))]">
                          {workspace.path}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(workspace.id)
                      }}
                      title="Remover da lista"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {workspace.description && (
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      {workspace.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
