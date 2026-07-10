import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
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
  /** Per-category totals over the FULL set, independent of pages loaded. */
  category_counts: Record<string, number>
}

const PAGE_SIZE = 200

export const myTasksKeys = {
  all: ["my-tasks"] as const,
  filtered: (filters?: MyTasksFilters) => [...myTasksKeys.all, filters ?? {}] as const,
}

export function useMyTasks(filters?: MyTasksFilters) {
  const query = useInfiniteQuery({
    queryKey: myTasksKeys.filtered(filters),
    queryFn: ({ pageParam }) =>
      api.get<MyTasksResponse>(
        `/admin/my/tasks${buildQuery({
          limit: PAGE_SIZE,
          offset: pageParam || undefined,
          workspace_id: filters?.workspace_id?.join(","),
          priority: filters?.priority?.join(","),
          type: filters?.type?.join(","),
          category: filters?.category?.join(","),
        })}`
      ),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const loaded = last.offset + last.issues.length
      return loaded < last.count ? loaded : undefined
    },
  })

  const issues = useMemo(
    () => query.data?.pages.flatMap((p) => p.issues) ?? [],
    [query.data]
  )
  const lastPage = query.data?.pages[query.data.pages.length - 1]

  return {
    ...query,
    /** All loaded issues, flattened across pages. */
    issues,
    /** Authoritative full-set count from the server. */
    count: lastPage?.count ?? 0,
    /** Full-set per-category totals from the server. */
    categoryCounts: lastPage?.category_counts ?? {},
  }
}
