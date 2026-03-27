import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import type { User } from "./useUsers"
import type { Team } from "./useWorkspaces"

export interface ProjectMemberEntry {
  id: string
  user_id: string
  role: "manager" | "member" | "viewer"
  app_role_name: string | null
  user: User | null
}

export interface ProjectTeamEntry {
  id: string
  team_id: string
  team: (Team & { member_count: number }) | null
}

export interface ProjectAccess {
  members: ProjectMemberEntry[]
  teams: ProjectTeamEntry[]
}

export interface ProjectAccessRequest {
  id: string
  project_id: string
  user_id: string
  message: string | null
  status: "pending" | "approved" | "denied"
  created_at: string
  user: { id: string; email: string; first_name: string; last_name: string } | null
}

const accessKeys = {
  project: (projectId: string) => ["projects", projectId, "access"] as const,
  requests: (projectId: string) => ["projects", projectId, "access-requests"] as const,
}

export function useProjectAccess(projectId: string) {
  return useQuery({
    queryKey: accessKeys.project(projectId),
    queryFn: () => api.get<ProjectAccess>(`/admin/projects/${projectId}/access`),
    enabled: !!projectId,
  })
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role?: string }) =>
      api.post(`/admin/projects/${projectId}/members`, { user_id: userId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useAddProjectMembersBatch(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, role }: { userIds: string[]; role?: string }) =>
      api.post<{ added: number; skipped: number }>(`/admin/projects/${projectId}/members/batch`, { user_ids: userIds, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useAddProjectTeam(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) =>
      api.post(`/admin/projects/${projectId}/teams`, { team_id: teamId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useAddProjectTeamsBatch(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamIds: string[]) =>
      api.post<{ added: number; skipped: number }>(`/admin/projects/${projectId}/teams/batch`, { team_ids: teamIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useRemoveProjectTeam(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) =>
      api.delete(`/admin/projects/${projectId}/teams/${teamId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
    },
  })
}

export function useProjectAccessRequests(projectId: string) {
  return useQuery({
    queryKey: accessKeys.requests(projectId),
    queryFn: () => api.get<{ requests: ProjectAccessRequest[] }>(`/admin/projects/${projectId}/access-requests`),
    enabled: !!projectId,
  })
}

export function useRequestProjectAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, message }: { projectId: string; message?: string }) =>
      api.post(`/admin/projects/${projectId}/access-requests`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useRequestProjectAccessByKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ identifier, message }: { identifier: string; message?: string }) =>
      api.post<{ access_request: ProjectAccessRequest }>(`/admin/projects/by-identifier/${encodeURIComponent(identifier)}/access-requests`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useCancelProjectAccessRequestByKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (identifier: string) =>
      api.delete(`/admin/projects/by-identifier/${encodeURIComponent(identifier)}/access-requests`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useHandleProjectAccessRequest(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "approve" | "deny" }) =>
      api.patch(`/admin/projects/${projectId}/access-requests/${requestId}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accessKeys.requests(projectId) })
      qc.invalidateQueries({ queryKey: accessKeys.project(projectId) })
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useCancelProjectAccessRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete(`/admin/projects/${projectId}/access-requests`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}
