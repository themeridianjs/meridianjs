import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import type { User } from "./useUsers"

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
  app_role_id: string | null
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
    mutationFn: (data: { email?: string; role: "admin" | "member"; app_role_id?: string | null }) =>
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

// ── Workspace Members ─────────────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string
  user_id: string
  role: "admin" | "member"
  app_role_id: string | null
  user: User | null
}

const memberKeys = {
  list: (workspaceId: string) => ["workspaces", workspaceId, "members"] as const,
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.list(workspaceId),
    queryFn: () =>
      api.get<{ members: WorkspaceMember[]; count: number }>(
        `/admin/workspaces/${workspaceId}/members`
      ),
    select: (data) => data.members,
    enabled: !!workspaceId,
  })
}

export function useAddWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { user_id: string; role: "admin" | "member" }) =>
      api.post<{ member: WorkspaceMember }>(`/admin/workspaces/${workspaceId}/members`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(workspaceId) })
    },
  })
}

export function useUpdateWorkspaceMemberRole(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      api.patch(`/admin/workspaces/${workspaceId}/members/${userId}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(workspaceId) })
    },
  })
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(workspaceId) })
    },
  })
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  workspace_id: string
  name: string
  description: string | null
  icon: string | null
  member_count: number
}

const teamKeys = {
  list: (workspaceId: string) => ["workspaces", workspaceId, "teams"] as const,
  members: (workspaceId: string, teamId: string) =>
    ["workspaces", workspaceId, "teams", teamId, "members"] as const,
}

export function useTeams(workspaceId: string) {
  return useQuery({
    queryKey: teamKeys.list(workspaceId),
    queryFn: () =>
      api.get<{ teams: Team[]; count: number }>(`/admin/workspaces/${workspaceId}/teams`),
    select: (data) => data.teams,
    enabled: !!workspaceId,
  })
}

export function useCreateTeam(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string }) =>
      api.post<{ team: Team }>(`/admin/workspaces/${workspaceId}/teams`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.list(workspaceId) })
    },
  })
}

export function useUpdateTeam(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, ...data }: { teamId: string; name?: string; description?: string; icon?: string }) =>
      api.put<{ team: Team }>(`/admin/workspaces/${workspaceId}/teams/${teamId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.list(workspaceId) })
    },
  })
}

export function useDeleteTeam(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) =>
      api.delete(`/admin/workspaces/${workspaceId}/teams/${teamId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.list(workspaceId) })
    },
  })
}

export interface TeamMemberEntry {
  id: string
  user_id: string
  user: User | null
}

export function useTeamMembers(workspaceId: string, teamId: string) {
  return useQuery({
    queryKey: teamKeys.members(workspaceId, teamId),
    queryFn: () =>
      api.get<{ members: TeamMemberEntry[]; count: number }>(
        `/admin/workspaces/${workspaceId}/teams/${teamId}/members`
      ),
    select: (data) => data.members,
    enabled: !!(workspaceId && teamId),
  })
}

export function useAddTeamMember(workspaceId: string, teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/workspaces/${workspaceId}/teams/${teamId}/members`, { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.members(workspaceId, teamId) })
      qc.invalidateQueries({ queryKey: teamKeys.list(workspaceId) })
    },
  })
}

export function useRemoveTeamMember(workspaceId: string, teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/workspaces/${workspaceId}/teams/${teamId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.members(workspaceId, teamId) })
      qc.invalidateQueries({ queryKey: teamKeys.list(workspaceId) })
    },
  })
}
