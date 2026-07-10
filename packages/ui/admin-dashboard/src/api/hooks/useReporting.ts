import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"
import type { TimeLog } from "./useTimeLogs"

export interface TimeLogUserGroup {
  user_id: string
  total_minutes: number
}

export interface TimeLogProjectGroup {
  /** null = time logged without a project */
  project_id: string | null
  total_minutes: number
  project_name: string | null
}

interface ReportingTimeLogsResponse {
  time_logs: TimeLog[]
  count: number
  total_minutes: number
  total_employees: number
  total_projects: number
  /** Full-set aggregates (sorted desc) — page-independent, used by the charts. */
  by_user: TimeLogUserGroup[]
  by_project: TimeLogProjectGroup[]
  limit: number
  offset: number
}

export interface ReportingFilters {
  user_id?: string
  user_ids?: string[]
  project_id?: string
  project_ids?: string[]
  workspace_id?: string
  workspace_ids?: string[]
  from?: string
  to?: string
  limit?: number
  offset?: number
  org_scope?: boolean
}

export const reportingKeys = {
  all: ["reporting"] as const,
  timeLogs: (filters: ReportingFilters) => [...reportingKeys.all, "time-logs", filters] as const,
}

export function useReportingTimeLogs(filters: ReportingFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportingKeys.timeLogs(filters),
    queryFn: () =>
      api.get<ReportingTimeLogsResponse>(
        `/admin/reporting/time-logs${buildQuery({
          user_id: filters.user_id,
          user_ids: filters.user_ids?.join(","),
          project_id: filters.project_id,
          project_ids: filters.project_ids?.join(","),
          workspace_id: filters.workspace_id,
          workspace_ids: filters.workspace_ids?.join(","),
          from: filters.from,
          to: filters.to,
          limit: filters.limit || undefined,
          offset: filters.offset || undefined,
          org_scope: filters.org_scope || undefined,
        })}`
      ),
    enabled: options?.enabled !== false,
  })
}
