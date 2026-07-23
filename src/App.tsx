import { useCallback, useState } from "react"
import { ThemeProvider } from "@/lib/theme"
import { ToastProvider } from "@/components/ui/toast"
import { WindowTitlebar } from "@/components/layout/window-titlebar"
import { UpdateManager } from "@/components/update-manager"
import { WorkspaceSelection } from "@/features/workspaces/workspace-selection"
import { WorkspaceView } from "@/features/workspaces/workspace-view"
import { useWorkspaces } from "@/features/workspaces/use-workspaces"
import type { Workspace } from "@/types"

function AppContent() {
  const { workspaces, loading, create, remove, refresh } = useWorkspaces()
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  )
  const handleCreate = useCallback(
    async (name: string, path: string, description: string) => {
      try {
        await create(name, path, description)
      } catch (err) {
        console.error("Failed to create workspace:", err)
      }
    },
    [create]
  )

  const handleOpen = useCallback((workspace: Workspace) => {
    setActiveWorkspace(workspace)
  }, [])

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await remove(id)
      } catch (err) {
        console.error("Failed to delete workspace:", err)
      }
    },
    [remove]
  )

  const handleBack = useCallback(() => {
    setActiveWorkspace(null)
    void refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
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
        <div className="flex h-screen flex-col overflow-hidden bg-[hsl(var(--background))]">
          <WindowTitlebar />
          <div className="min-h-0 flex-1">
            <AppContent />
          </div>
        </div>
        <UpdateManager />
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
