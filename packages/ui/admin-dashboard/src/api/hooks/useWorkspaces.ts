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

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.put<{ workspace: Workspace }>(`/admin/workspaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

// ── Invitations ───────────────────────────────────────────────────────────────

export interface Invitation {
  id: string
  workspace_id: string
  email: string | null
  role: "admin" | "member"
  token: string
  status: "pending" | "accepted" | "revoked"
  created_by: string
  created_at: string
  updated_at: string
}

const invitationKeys = {
  list: (workspaceId: string) => ["workspaces", workspaceId, "invitations"] as const,
}

export function useInvitations(workspaceId: string) {
  return useQuery({
    queryKey: invitationKeys.list(workspaceId),
    queryFn: () =>
      api.get<{ invitations: Invitation[]; count: number }>(
        `/admin/workspaces/${workspaceId}/invitations`
      ),
    select: (data) => data.invitations,
    enabled: !!workspaceId,
  })
}

export function useCreateInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email?: string; role: "admin" | "member" }) =>
      api.post<{ invitation: Invitation }>(
        `/admin/workspaces/${workspaceId}/invitations`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.list(workspaceId) })
    },
  })
}

export function useRevokeInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.delete(`/admin/workspaces/${workspaceId}/invitations/${inviteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.list(workspaceId) })
    },
  })
}
