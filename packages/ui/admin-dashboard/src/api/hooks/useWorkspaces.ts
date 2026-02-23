import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  updated_at: string
}

interface WorkspacesResponse {
  workspaces: Workspace[]
  count: number
}

export function useWorkspaces(enabled = true) {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<WorkspacesResponse>("/admin/workspaces"),
    select: (data) => data.workspaces,
    enabled,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post<{ workspace: Workspace }>("/admin/workspaces", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
