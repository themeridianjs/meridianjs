import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import type { TimeLog } from "./useTimeLogs"

interface ReportingTimeLogsResponse {
  time_logs: TimeLog[]
  count: number
  total_minutes: number
  total_employees: number
  total_projects: number
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
}

export const reportingKeys = {
  all: ["reporting"] as const,
  timeLogs: (filters: ReportingFilters) => [...reportingKeys.all, "time-logs", filters] as const,
}

export function useReportingTimeLogs(filters: ReportingFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportingKeys.timeLogs(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (!v) return
        if ((k === "workspace_ids" || k === "user_ids" || k === "project_ids") && Array.isArray(v)) {
          if (v.length > 0) params.set(k, v.join(","))
        } else if (typeof v === "string") {
          params.set(k, v)
        } else if (typeof v === "number") {
          params.set(k, String(v))
        }
      })
      return api.get<ReportingTimeLogsResponse>(`/admin/reporting/time-logs?${params}`)
    },
    enabled: options?.enabled !== false,
  })
}
