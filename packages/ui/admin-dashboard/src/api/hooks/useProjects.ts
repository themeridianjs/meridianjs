import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import { useAuth } from "@/stores/auth"

const SUGGEST_DEBOUNCE_MS = 250
const CHECK_DEBOUNCE_MS = 300

export interface Project {
  id: string
  name: string
  identifier: string
  description?: string
  status: string
  visibility?: string
  icon?: string | null
  color?: string | null
  share_token?: string | null
  metadata?: Record<string, unknown> | null
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

export interface ProjectActivity {
  id: string
  entity_type: string
  entity_id: string
  actor_id: string
  action: string
  changes?: Record<string, { from: unknown; to: unknown }> | null
  workspace_id: string
  created_at: string
}

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  byKey: (key: string) => [...projectKeys.all, "key", key] as const,
  activities: (id: string) => [...projectKeys.all, id, "activities"] as const,
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

/** Look up a project by its short identifier/key (e.g. "PROJ"). */
export function useProjectByKey(identifier: string) {
  return useQuery({
    queryKey: projectKeys.byKey(identifier),
    queryFn: () =>
      api.get<{ project: Project }>(`/admin/projects/by-identifier/${encodeURIComponent(identifier)}`),
    select: (data) => data.project,
    enabled: !!identifier,
  })
}

/** Suggested project key from name (backend-generated). Debounced. */
export function useSuggestProjectIdentifier(name: string, options: { enabled?: boolean } = {}) {
  const [debouncedName, setDebouncedName] = useState(name)
  const enabled = options.enabled !== false

  useEffect(() => {
    if (!enabled) return
    const t = setTimeout(() => setDebouncedName(name), SUGGEST_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [name, enabled])

  const query = useQuery({
    queryKey: ["projects", "suggest-identifier", debouncedName] as const,
    queryFn: () =>
      api.get<{ identifier: string }>(
        `/admin/projects/suggest-identifier?name=${encodeURIComponent(debouncedName)}`
      ),
    select: (data) => data.identifier,
    enabled: enabled && debouncedName.trim().length > 0,
  })

  /** Immediately flush the current name into the debounced value, bypassing the timer. */
  const flush = () => setDebouncedName(name)

  return { ...query, flush }
}

/** Check if a project key is available. Debounced; only runs for valid keys (e.g. length >= 3). */
export function useCheckProjectIdentifier(identifier: string, options: { enabled?: boolean } = {}) {
  const normalized = identifier.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const [debouncedId, setDebouncedId] = useState(normalized)
  const enabled = options.enabled !== false && normalized.length >= 3

  useEffect(() => {
    if (!normalized) {
      setDebouncedId("")
      return
    }
    const t = setTimeout(() => setDebouncedId(normalized), CHECK_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [normalized])

  const query = useQuery({
    queryKey: ["projects", "check-identifier", debouncedId] as const,
    queryFn: () =>
      api.get<{ available: boolean }>(
        `/admin/projects/check-identifier/${encodeURIComponent(debouncedId)}`
      ),
    select: (data) => data.available,
    enabled: enabled && debouncedId.length >= 3,
  })
  return {
    available: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  }
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

export function useGenerateShareToken(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ share_url: string; project: Project }>(`/admin/projects/${projectId}/share`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      qc.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}

export function useRevokeShareToken(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ project: Project }>(`/admin/projects/${projectId}/share`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      qc.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}

export function useProjectActivities(projectId: string) {
  return useQuery({
    queryKey: projectKeys.activities(projectId),
    queryFn: () => api.get<{ activities: ProjectActivity[] }>(`/admin/projects/${projectId}/activities`),
    select: (data) => data.activities,
    enabled: !!projectId,
  })
}
