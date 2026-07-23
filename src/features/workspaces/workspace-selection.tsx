import { useState } from "react"
import {
  FolderPlus,
  FolderOpen,
  Search,
  Cpu,
  Trash2,
  Settings,
  FolderInput,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <div className="flex h-full flex-col">
      <header className="flex h-10 items-center justify-between border-b border-[hsl(var(--border))] px-4">
        <div className="flex items-center gap-2">
          <span className="text-[hsl(var(--accent))]">$</span>
          <span className="text-sm font-semibold tracking-tight">atena</span>
          <span className="ml-1 text-[10px] text-[hsl(var(--muted))]">
            local-first multi-agent control center
          </span>
        </div>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <div className="space-y-1">
            <h1 className="text-sm font-medium">
              <span className="text-[hsl(var(--accent))]">{">"}</span> select
              workspace
            </h1>
            <p className="text-[11px] text-[hsl(var(--muted))]">
              organize projects, agents and sessions locally
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--muted))]" />
              <Input
                placeholder="search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="default"
              size="md"
              onClick={() => setShowCreate(!showCreate)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              new
            </Button>
          </div>

          {showCreate && (
            <div className="space-y-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[hsl(var(--muted))]">
                  name
                </label>
                <Input
                  placeholder="my-project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[hsl(var(--muted))]">
                  path
                </label>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="C:\projetos\meu-projeto"
                    value={path}
                    onChange={(e) => {
                      setPath(e.target.value)
                      checkPath(e.target.value)
                    }}
                    className={cn(
                      pathValid === false && "border-[hsl(var(--danger))]",
                      pathValid === true && "border-[hsl(var(--success))]"
                    )}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePickFolder}
                    title="browse"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {pathChecking && (
                  <p className="text-[10px] text-[hsl(var(--muted))]">
                    checking...
                  </p>
                )}
                {pathValid === true && (
                  <p className="flex items-center gap-1 text-[10px] text-[hsl(var(--success))]">
                    <CheckCircle2 className="h-2.5 w-2.5" /> valid
                  </p>
                )}
                {pathValid === false && (
                  <p className="flex items-center gap-1 text-[10px] text-[hsl(var(--danger))]">
                    <AlertCircle className="h-2.5 w-2.5" /> not found
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[hsl(var(--muted))]">
                  description
                </label>
                <Input
                  placeholder="optional"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!name.trim() || !path.trim() || !pathValid}
                >
                  create
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[hsl(var(--border))] p-8 text-center">
              <Cpu className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
              <div>
                <p className="text-xs text-[hsl(var(--foreground))]">
                  no workspaces found
                </p>
                <p className="mt-0.5 text-[10px] text-[hsl(var(--muted))]">
                  create your first workspace to get started
                </p>
              </div>
              {!showCreate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="mt-1"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  create workspace
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((workspace) => (
                <div
                  key={workspace.id}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] px-3 py-2 transition-colors hover:border-[hsl(var(--accent)/0.4)]"
                  onClick={() => onOpen(workspace)}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--accent))]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {workspace.name}
                    </p>
                    <p className="truncate text-[10px] text-[hsl(var(--muted))]">
                      {workspace.path}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(workspace.id)
                    }}
                    title="remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
