import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"
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
  const qs = buildQuery({
    status: filters.status,
    priority: filters.priority,
    search: filters.search,
  })

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
