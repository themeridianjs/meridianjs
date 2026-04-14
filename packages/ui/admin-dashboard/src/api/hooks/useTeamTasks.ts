import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import type { MyTaskIssue, MyTasksFilters } from "./useMyTasks"

export interface TeamTaskIssue extends MyTaskIssue {
  _private: boolean
}

export interface TeamTasksResponse {
  issues: TeamTaskIssue[]
  count: number
  limit: number
  offset: number
}

export const teamTasksKeys = {
  all: ["team-tasks"] as const,
  filtered: (userId: string, filters?: MyTasksFilters) =>
    [...teamTasksKeys.all, userId, filters ?? {}] as const,
}

export function useTeamTasks(userId: string | null, filters?: MyTasksFilters) {
  return useQuery({
    queryKey: teamTasksKeys.filtered(userId ?? "", filters),
    queryFn: () => {
      const params = new URLSearchParams()
      params.set("user_id", userId!)
      params.set("limit", "200")
      if (filters?.workspace_id?.length) params.set("workspace_id", filters.workspace_id.join(","))
      if (filters?.priority?.length) params.set("priority", filters.priority.join(","))
      if (filters?.type?.length) params.set("type", filters.type.join(","))
      if (filters?.category?.length) params.set("category", filters.category.join(","))
      return api.get<TeamTasksResponse>(`/admin/team/tasks?${params}`)
    },
    enabled: !!userId,
    select: (data) => data.issues,
  })
}
