import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface ProjectHealthUpdate {
  id: string
  project_id: string
  health: "on_track" | "delayed" | "on_hold" | "completed"
  title: string
  summary: string | null
  report_date: string | null
  created_by: string | null
  collaborators: string[]
  created_at: string
}

const healthKeys = {
  byProject: (projectId: string) => ["projects", projectId, "health"] as const,
  single: (projectId: string, updateId: string) => ["projects", projectId, "health", updateId] as const,
}

export function useProjectHealthUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: healthKeys.byProject(projectId ?? ""),
    queryFn: () =>
      api.get<{ updates: ProjectHealthUpdate[] }>(`/admin/projects/${projectId}/health`),
    select: (data) => data.updates,
    enabled: !!projectId,
  })
}

export function useProjectHealthUpdate(projectId: string | undefined, updateId: string | undefined) {
  return useQuery({
    queryKey: healthKeys.single(projectId ?? "", updateId ?? ""),
    queryFn: () =>
      api.get<{ update: ProjectHealthUpdate }>(`/admin/projects/${projectId}/health/${updateId}`),
    select: (data) => data.update,
    enabled: !!projectId && !!updateId,
  })
}

export function useCreateProjectHealthUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { health: ProjectHealthUpdate["health"]; title: string; summary?: string | null; report_date?: string | null; collaborators?: string[] }) =>
      api.post<{ update: ProjectHealthUpdate }>(`/admin/projects/${projectId}/health`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.byProject(projectId) })
    },
  })
}

export function useUpdateProjectHealthUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ updateId, ...data }: { updateId: string; health?: ProjectHealthUpdate["health"]; title?: string; summary?: string | null; report_date?: string | null; collaborators?: string[] }) =>
      api.put<{ update: ProjectHealthUpdate }>(`/admin/projects/${projectId}/health/${updateId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: healthKeys.byProject(projectId) })
      qc.invalidateQueries({ queryKey: healthKeys.single(projectId, vars.updateId) })
    },
  })
}

export function useDeleteProjectHealthUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updateId: string) =>
      api.delete<void>(`/admin/projects/${projectId}/health/${updateId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.byProject(projectId) })
    },
  })
}

export function useSendHealthReport(projectId: string) {
  return useMutation({
    mutationFn: (updateId: string) =>
      api.post<{ sent: number }>(`/admin/projects/${projectId}/health/${updateId}/send`, {}),
  })
}
