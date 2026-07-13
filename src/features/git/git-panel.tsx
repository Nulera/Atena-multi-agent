import { useState, useCallback, useEffect } from "react"
import {
  GitBranch,
  GitCommit,
  FileText,
  Copy,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { gitStatus, gitDiff, type GitStatus, type GitFile } from "@/lib/git"
import { useToast } from "@/components/ui/toast"

interface GitPanelProps {
  workspacePath: string
  onBranchChange?: (branch: string) => void
}

const statusLabels: Record<string, { label: string; variant: "warning" | "danger" | "success" | "accent" | "muted" }> = {
  M: { label: "Modified", variant: "warning" },
  A: { label: "Added", variant: "success" },
  D: { label: "Deleted", variant: "danger" },
  R: { label: "Renamed", variant: "accent" },
  "?": { label: "Untracked", variant: "muted" },
  U: { label: "Unmerged", variant: "danger" },
}

function getStatusInfo(status: string) {
  const code = status.replace(/\s/g, "").charAt(0) || "?"
  return statusLabels[code] ?? { label: status, variant: "muted" as const }
}

export function GitPanel({ workspacePath, onBranchChange }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null)
  const [diff, setDiff] = useState("")
  const [loading, setLoading] = useState(true)
  const [diffLoading, setDiffLoading] = useState(false)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const s = await gitStatus(workspacePath)
      setStatus(s)
      onBranchChange?.(s.branch)
    } catch (err) {
      console.error("Git status error:", err)
    } finally {
      setLoading(false)
    }
  }, [workspacePath, onBranchChange])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadDiff = useCallback(
    async (file: GitFile) => {
      setDiffLoading(true)
      try {
        const d = await gitDiff(workspacePath, file.path)
        setDiff(d)
      } catch (err) {
        setDiff(`Error: ${err}`)
      } finally {
        setDiffLoading(false)
      }
    },
    [workspacePath]
  )

  const handleSelectFile = useCallback(
    (file: GitFile) => {
      setSelectedFile(file)
      loadDiff(file)
    },
    [loadDiff]
  )

  const copyDiff = useCallback(() => {
    navigator.clipboard.writeText(diff)
    toast({ title: "Diff copiado", variant: "success" })
  }, [diff, toast])

  if (!loading && !status?.isRepo) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState
          icon={<GitBranch className="h-8 w-8" />}
          title="Não é um repositório Git"
          description="A pasta do workspace não contém um repositório Git"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex w-64 flex-col border-r border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-3">
          <GitBranch className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
          <span className="text-xs font-medium truncate">
            {status?.branch || "..."}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={refresh}
            title="Atualizar"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-xs text-[hsl(var(--muted-foreground))]">
              Carregando...
            </p>
          ) : status?.modifiedFiles.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<GitCommit className="h-6 w-6" />}
                title="Sem alterações"
                description="Nenhum arquivo modificado"
                className="p-3"
              />
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {status?.modifiedFiles.map((file) => {
                const info = getStatusInfo(file.status)
                return (
                  <div
                    key={file.path}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors",
                      selectedFile?.path === file.path
                        ? "bg-[hsl(var(--accent)/0.1)]"
                        : "hover:bg-[hsl(var(--panel-elevated))]"
                    )}
                    onClick={() => handleSelectFile(file)}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {file.path}
                    </span>
                    <Badge
                      variant={info.variant}
                      className="shrink-0 text-[10px]"
                    >
                      {info.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedFile ? (
          <>
            <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-3">
              <FileText className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-xs font-medium truncate">
                {selectedFile.path}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={copyDiff}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  title="Abrir no editor"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {diffLoading ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Carregando diff...
                </p>
              ) : (
                <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-[hsl(var(--foreground))]">
                  {diff || "Sem alterações neste arquivo."}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="Selecione um arquivo"
              description="Escolha um arquivo modificado para ver o diff"
            />
          </div>
        )}
      </div>
    </div>
  )
}
