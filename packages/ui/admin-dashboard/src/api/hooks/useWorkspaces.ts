import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"
import type { User } from "./useUsers"

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  logo_url: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

interface WorkspacesResponse {
  workspaces: Workspace[]
  count: number
}

export function useWorkspaces(enabledOrOptions: boolean | { orgScope?: boolean; refetchInterval?: number | false } = true) {
  const enabled = typeof enabledOrOptions === "boolean" ? enabledOrOptions : true
  const orgScope = typeof enabledOrOptions === "object" ? (enabledOrOptions.orgScope ?? false) : false
  const refetchInterval = typeof enabledOrOptions === "object" ? (enabledOrOptions.refetchInterval ?? false) : false
  const qs = buildQuery({ org_scope: orgScope || undefined })
  return useQuery({
    queryKey: ["workspaces", orgScope ? "org" : "default"],
    queryFn: () => api.get<WorkspacesResponse>(`/admin/workspaces${qs}`),
    select: (data) => data.workspaces,
    enabled,
    refetchInterval,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; is_private?: boolean }) =>
      api.post<{ workspace: Workspace }>("/admin/workspaces", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name?: string; is_private?: boolean }) =>
      api.put<{ workspace: Workspace }>(`/admin/workspaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useUploadWorkspaceLogo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("logo", file)
      return api.upload<{ workspace: Workspace }>(`/admin/workspaces/${id}/logo`, form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  })
}

export function useRemoveWorkspaceLogo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ workspace: Workspace }>(`/admin/workspaces/${id}/logo`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  })
}

// ── Invitations ───────────────────────────────────────────────────────────────

export interface Invitation {
  id: string
  workspace_id: string
  email: string | null
  role: "super-admin" | "admin" | "member"
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
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email?: string; role: "super-admin" | "admin" | "member"; app_role_id?: string | null }) =>
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

export function useResendInvitation(workspaceId: string) {
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.post(`/admin/workspaces/${workspaceId}/invitations/${inviteId}/resend`),
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
    staleTime: 1000 * 60 * 2,
  })
}

export function useAddWorkspaceMembersBatch(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { user_ids: string[]; role: "admin" | "member"; app_role_id?: string | null }) =>
      api.post<{ added: number; skipped: number }>(`/admin/workspaces/${workspaceId}/members/batch`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(workspaceId) })
      qc.invalidateQueries({ queryKey: ["workspaces"] })
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
      qc.invalidateQueries({ queryKey: ["workspaces"] })
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
    staleTime: 1000 * 60 * 2,
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

// ── Workspace search (browse public workspaces) ────────────────────────────────

export interface WorkspaceSearchResult {
  id: string
  name: string
  slug: string
  is_private: boolean
  is_member: boolean
  has_pending_request: boolean
}

export function useSearchWorkspaces(query: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  return useQuery({
    queryKey: ["workspaces", "search", query],
    queryFn: () =>
      api.get<{ workspaces: WorkspaceSearchResult[] }>(
        `/admin/workspaces/search?q=${encodeURIComponent(query)}`
      ),
    select: (data) => data.workspaces,
    enabled,
    staleTime: 10_000,
  })
}

// ── Workspace access requests ──────────────────────────────────────────────────

export interface AccessRequest {
  id: string
  workspace_id: string
  user_id: string
  message: string | null
  status: "pending" | "approved" | "denied"
  created_at: string
  user: { id: string; email: string; first_name: string; last_name: string } | null
}

const accessRequestKeys = {
  list: (workspaceId: string) => ["workspaces", workspaceId, "access-requests"] as const,
}

export function useWorkspaceAccessRequests(workspaceId: string) {
  return useQuery({
    queryKey: accessRequestKeys.list(workspaceId),
    queryFn: () =>
      api.get<{ access_requests: AccessRequest[]; count: number }>(
        `/admin/workspaces/${workspaceId}/access-requests`
      ),
    select: (data) => data.access_requests,
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useRequestWorkspaceAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, message }: { workspaceId: string; message?: string }) =>
      api.post<{ access_request: AccessRequest }>(
        `/admin/workspaces/${workspaceId}/access-requests`,
        { message: message ?? null }
      ),
    onSuccess: (_data, { workspaceId }) => {
      qc.invalidateQueries({ queryKey: accessRequestKeys.list(workspaceId) })
    },
  })
}

export function useHandleAccessRequest(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "approve" | "deny" }) =>
      api.patch<{ access_request: AccessRequest }>(
        `/admin/workspaces/${workspaceId}/access-requests/${requestId}`,
        { action }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessRequestKeys.list(workspaceId) })
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export interface MyWorkspaceAccessRequest {
  id: string
  workspace_id: string
  workspace_name: string | null
  workspace_slug: string | null
  message: string | null
  status: "pending"
  created_at: string
}

export function useMyWorkspaceAccessRequests() {
  return useQuery({
    queryKey: ["workspaces", "my-access-requests"] as const,
    queryFn: () => api.get<{ requests: MyWorkspaceAccessRequest[] }>("/admin/workspaces/my-access-requests"),
    select: (data) => data.requests,
  })
}

export function useCancelWorkspaceAccessRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, requestId }: { workspaceId: string; requestId: string }) =>
      api.delete(`/admin/workspaces/${workspaceId}/access-requests/${requestId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces", "my-access-requests"] })
      qc.invalidateQueries({ queryKey: ["workspaces", "search"] })
    },
  })
}
