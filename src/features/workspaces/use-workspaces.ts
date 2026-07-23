import { useCallback, useEffect, useState } from "react"
import { normalizeAppError, type AppError } from "@/lib/errors"
import type { Workspace } from "@/types"
import {
  tauriWorkspaceGateway,
  type WorkspaceGateway,
} from "./workspace-gateway"

export function useWorkspaces(
  gateway: WorkspaceGateway = tauriWorkspaceGateway
) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setWorkspaces(await gateway.list())
    } catch (failure) {
      setError(normalizeAppError(failure, "workspace.list"))
    } finally {
      setLoading(false)
    }
  }, [gateway])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string, path: string, description: string) => {
      try {
        await gateway.create(name, path, description)
        await refresh()
      } catch (failure) {
        const nextError = normalizeAppError(failure, "workspace.create")
        setError(nextError)
        throw nextError
      }
    },
    [gateway, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await gateway.remove(id)
        await refresh()
      } catch (failure) {
        const nextError = normalizeAppError(failure, "workspace.delete")
        setError(nextError)
        throw nextError
      }
    },
    [gateway, refresh]
  )

  return { workspaces, loading, error, refresh, create, remove }
}
