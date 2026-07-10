import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
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
  /** Per-category totals over the FULL set, independent of pages loaded. */
  category_counts: Record<string, number>
}

const PAGE_SIZE = 200

export const teamTasksKeys = {
  all: ["team-tasks"] as const,
  filtered: (userId: string, filters?: MyTasksFilters) =>
    [...teamTasksKeys.all, userId, filters ?? {}] as const,
}

export function useTeamTasks(userId: string | null, filters?: MyTasksFilters) {
  const query = useInfiniteQuery({
    queryKey: teamTasksKeys.filtered(userId ?? "", filters),
    queryFn: ({ pageParam }) =>
      api.get<TeamTasksResponse>(
        `/admin/team/tasks${buildQuery({
          user_id: userId!,
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
    enabled: !!userId,
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
