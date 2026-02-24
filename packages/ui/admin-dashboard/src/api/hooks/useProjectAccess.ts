import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import type { User } from "./useUsers"
import type { Team } from "./useWorkspaces"

export interface ProjectMemberEntry {
  id: string
  user_id: string
  role: "manager" | "member" | "viewer"
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

const accessKeys = {
  project: (projectId: string) => ["projects", projectId, "access"] as const,
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
