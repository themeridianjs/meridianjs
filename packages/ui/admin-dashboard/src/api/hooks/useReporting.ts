import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import type { TimeLog } from "./useTimeLogs"

interface ReportingTimeLogsResponse {
  time_logs: TimeLog[]
  total_minutes: number
}

export interface ReportingFilters {
  user_id?: string
  project_id?: string
  workspace_id?: string
  from?: string
  to?: string
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
        if (v) params.set(k, v)
      })
      return api.get<ReportingTimeLogsResponse>(`/admin/reporting/time-logs?${params}`)
    },
    enabled: options?.enabled ?? Object.values(filters).some(Boolean),
  })
}
