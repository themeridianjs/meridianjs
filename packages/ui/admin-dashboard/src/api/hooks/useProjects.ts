import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import { useAuth } from "@/stores/auth"

export interface Project {
  id: string
  name: string
  identifier: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

interface ProjectsResponse {
  projects: Project[]
  count: number
}

interface CreateProjectInput {
  name: string
  identifier: string
  description?: string
  workspace_id: string
}

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
}

export function useProjects() {
  const { workspace } = useAuth()
  return useQuery({
    queryKey: [...projectKeys.list(), workspace?.id],
    queryFn: () => {
      const qs = workspace?.id ? `?workspace_id=${workspace.id}` : ""
      return api.get<ProjectsResponse>(`/admin/projects${qs}`)
    },
    select: (data) => data.projects,
    enabled: !!workspace?.id,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.get<{ project: Project }>(`/admin/projects/${id}`),
    select: (data) => data.project,
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      api.post<{ project: Project }>("/admin/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateProjectInput> & { status?: string }) =>
      api.put<{ project: Project }>(`/admin/projects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list() })
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}
