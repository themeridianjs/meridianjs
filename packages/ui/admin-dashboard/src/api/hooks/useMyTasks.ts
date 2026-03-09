import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
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
    queryFn: () => {
      const params = new URLSearchParams()
      params.set("limit", "200")
      if (filters?.workspace_id?.length) params.set("workspace_id", filters.workspace_id.join(","))
      if (filters?.priority?.length) params.set("priority", filters.priority.join(","))
      if (filters?.type?.length) params.set("type", filters.type.join(","))
      if (filters?.category?.length) params.set("category", filters.category.join(","))
      return api.get<MyTasksResponse>(`/admin/my/tasks?${params}`)
    },
    select: (data) => data.issues,
  })
}
