import { useCallback, useEffect, useState } from "react"
import { ThemeProvider } from "@/lib/theme"
import { ToastProvider } from "@/components/ui/toast"
import { WorkspaceSelection } from "@/features/workspaces/workspace-selection"
import { WorkspaceView } from "@/features/workspaces/workspace-view"
import {
  listWorkspaces,
  createWorkspace,
  deleteWorkspace,
} from "@/lib/db"
import type { Workspace } from "@/types"

function AppContent() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  const refreshWorkspaces = useCallback(async () => {
    try {
      const list = await listWorkspaces()
      setWorkspaces(list)
    } catch (err) {
      console.error("Failed to load workspaces:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshWorkspaces()
  }, [refreshWorkspaces])

  const handleCreate = useCallback(
    async (name: string, path: string, description: string) => {
      try {
        await createWorkspace(name, path, description)
        await refreshWorkspaces()
      } catch (err) {
        console.error("Failed to create workspace:", err)
      }
    },
    [refreshWorkspaces]
  )

  const handleOpen = useCallback((workspace: Workspace) => {
    setActiveWorkspace(workspace)
  }, [])

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await deleteWorkspace(id)
        await refreshWorkspaces()
      } catch (err) {
        console.error("Failed to delete workspace:", err)
      }
    },
    [refreshWorkspaces]
  )

  const handleBack = useCallback(() => {
    setActiveWorkspace(null)
    refreshWorkspaces()
  }, [refreshWorkspaces])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Carregando...
        </p>
      </div>
    )
  }

  if (activeWorkspace) {
    return (
      <WorkspaceView workspace={activeWorkspace} onBack={handleBack} />
    )
  }

  return (
    <WorkspaceSelection
      workspaces={workspaces}
      onCreate={handleCreate}
      onOpen={handleOpen}
      onRemove={handleRemove}
    />
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
