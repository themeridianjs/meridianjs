import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import type { ProjectStatus } from "./useProjectStatuses"
import type { Issue } from "./useIssues"

export interface PublicProject {
  id: string
  name: string
  identifier: string
  description?: string | null
  icon?: string | null
  color?: string | null
  statuses: ProjectStatus[]
}

interface PublicIssueFilters {
  status?: string
  priority?: string
  search?: string
}

export function usePublicProject(token: string) {
  return useQuery({
    queryKey: ["public", "share", token],
    queryFn: () => api.get<{ project: PublicProject }>(`/public/share/${token}`),
    select: (data) => data.project,
    enabled: !!token,
    retry: false,
  })
}

export function usePublicIssues(token: string, filters: PublicIssueFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString() ? `?${params.toString()}` : ""

  return useQuery({
    queryKey: ["public", "share", token, "issues", filters],
    queryFn: () => api.get<{ issues: (Issue & { assignees?: { id: string; name: string; initials: string }[] })[] }>(`/public/share/${token}/issues${qs}`),
    select: (data) => data.issues,
    enabled: !!token,
    retry: false,
  })
}

export function usePublicSprints(token: string) {
  return useQuery({
    queryKey: ["public", "share", token, "sprints"],
    queryFn: () => api.get<{ sprints: any[] }>(`/public/share/${token}/sprints`),
    select: (data) => data.sprints,
    enabled: !!token,
    retry: false,
  })
}
