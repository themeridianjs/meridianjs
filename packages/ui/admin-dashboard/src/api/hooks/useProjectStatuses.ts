import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface ProjectStatus {
  id: string
  project_id: string
  name: string
  key: string
  color: string
  category: "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  position: number
}

const statusKeys = {
  byProject: (projectId: string) => ["projects", projectId, "statuses"] as const,
}

export function useProjectStatuses(projectId: string | undefined) {
  return useQuery({
    queryKey: statusKeys.byProject(projectId ?? ""),
    queryFn: () =>
      api.get<{ statuses: ProjectStatus[] }>(`/admin/projects/${projectId}/statuses`),
    select: (data) => data.statuses,
    enabled: !!projectId,
  })
}

export function useCreateProjectStatus(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string; category: ProjectStatus["category"] }) =>
      api.post<{ status: ProjectStatus }>(`/admin/projects/${projectId}/statuses`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: statusKeys.byProject(projectId) })
    },
  })
}

export function useUpdateProjectStatus(projectId: string, statusId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Pick<ProjectStatus, "name" | "color" | "category">>) =>
      api.put<{ status: ProjectStatus }>(`/admin/projects/${projectId}/statuses/${statusId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: statusKeys.byProject(projectId) })
    },
  })
}

export function useDeleteProjectStatus(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (statusId: string) =>
      api.delete<void>(`/admin/projects/${projectId}/statuses/${statusId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: statusKeys.byProject(projectId) })
    },
  })
}

export function useReorderProjectStatuses(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post<void>(`/admin/projects/${projectId}/statuses/reorder`, { orderedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: statusKeys.byProject(projectId) })
    },
  })
}
