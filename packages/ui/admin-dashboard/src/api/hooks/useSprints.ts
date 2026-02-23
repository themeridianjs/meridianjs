import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface Sprint {
  id: string
  name: string
  goal?: string | null
  project_id: string
  status: "planned" | "active" | "completed"
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
}

export const sprintKeys = {
  all: ["sprints"] as const,
  byProject: (projectId: string) => ["sprints", "project", projectId] as const,
  detail: (id: string) => ["sprints", id] as const,
}

export function useSprints(projectId?: string) {
  return useQuery({
    queryKey: projectId ? sprintKeys.byProject(projectId) : sprintKeys.all,
    queryFn: () => {
      const url = projectId
        ? `/admin/sprints?project_id=${projectId}`
        : "/admin/sprints"
      return api.get<{ sprints: Sprint[]; count: number }>(url)
    },
    select: (data) => data.sprints,
    enabled: !!projectId,
  })
}

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      goal?: string
      start_date?: string | null
      end_date?: string | null
    }) => api.post<{ sprint: Sprint }>("/admin/sprints", { ...data, project_id: projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.byProject(projectId) })
    },
  })
}

export function useUpdateSprint(id: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Pick<Sprint, "name" | "goal" | "status" | "start_date" | "end_date">>) =>
      api.put<{ sprint: Sprint }>(`/admin/sprints/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.byProject(projectId) })
      qc.invalidateQueries({ queryKey: sprintKeys.detail(id) })
    },
  })
}

export function useDeleteSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/sprints/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.byProject(projectId) })
    },
  })
}
