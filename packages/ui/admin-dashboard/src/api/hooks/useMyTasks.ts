import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"
import type { Issue } from "./useIssues"

export interface MyTaskIssue extends Issue {
  _project: { name: string; identifier: string } | null
  _status: { name: string; color: string; category: string }
}

export interface MyTasksFilters {
  workspace_id?: string[]
  priority?: string[]
  type?: string[]
  category?: string[]
}

export interface MyTasksResponse {
  issues: MyTaskIssue[]
  count: number
  limit: number
  offset: number
}

export const myTasksKeys = {
  all: ["my-tasks"] as const,
  filtered: (filters?: MyTasksFilters) => [...myTasksKeys.all, filters ?? {}] as const,
}

export function useMyTasks(filters?: MyTasksFilters) {
  return useQuery({
    queryKey: myTasksKeys.filtered(filters),
    queryFn: () =>
      api.get<MyTasksResponse>(
        `/admin/my/tasks${buildQuery({
          limit: 200,
          workspace_id: filters?.workspace_id?.join(","),
          priority: filters?.priority?.join(","),
          type: filters?.type?.join(","),
          category: filters?.category?.join(","),
        })}`
      ),
    select: (data) => data.issues,
  })
}
