import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from "@/lib/db"
import type { Workspace } from "@/types"

export interface WorkspaceGateway {
  list(): Promise<Workspace[]>
  create(
    name: string,
    path: string,
    description: string
  ): Promise<Workspace>
  remove(id: string): Promise<void>
}

export const tauriWorkspaceGateway: WorkspaceGateway = {
  list: listWorkspaces,
  create: createWorkspace,
  remove: deleteWorkspace,
}
