import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"
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
    queryFn: () =>
      api.get<TeamTasksResponse>(
        `/admin/team/tasks${buildQuery({
          user_id: userId!,
          limit: 200,
          workspace_id: filters?.workspace_id?.join(","),
          priority: filters?.priority?.join(","),
          type: filters?.type?.join(","),
          category: filters?.category?.join(","),
        })}`
      ),
    enabled: !!userId,
    select: (data) => data.issues,
  })
}
