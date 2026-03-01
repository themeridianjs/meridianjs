import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface TimeLog {
  id: string
  issue_id: string
  user_id: string
  workspace_id: string
  project_id: string | null
  duration_minutes: number | null
  description: string | null
  logged_date: string | null
  started_at: string | null
  stopped_at: string | null
  source: "manual" | "timer"
  created_at: string
  /** Enriched by reporting API only */
  issue_identifier?: string | null
  issue_title?: string | null
}

interface TimeLogsResponse {
  time_logs: TimeLog[]
  total_minutes: number
}

interface LogTimeInput {
  duration_minutes: number
  description?: string
  logged_date?: string
}

export const timeLogKeys = {
  byIssue: (issueId: string) => ["time-logs", issueId] as const,
  activeTimer: (issueId: string) => ["time-logs", issueId, "active-timer"] as const,
}

export function useTimeLogs(issueId: string) {
  return useQuery({
    queryKey: timeLogKeys.byIssue(issueId),
    queryFn: () =>
      api.get<TimeLogsResponse>(`/admin/issues/${issueId}/time-logs`),
    enabled: !!issueId,
  })
}

export function useActiveTimer(issueId: string) {
  return useQuery({
    queryKey: timeLogKeys.activeTimer(issueId),
    queryFn: () =>
      api.get<{ active_timer: TimeLog | null }>(`/admin/issues/${issueId}/time-logs/timer`),
    select: (data) => data.active_timer,
    enabled: !!issueId,
    // Poll every 10s when mounted so elapsed time stays accurate server-side
    refetchInterval: 10_000,
  })
}

export function useLogTime(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LogTimeInput) =>
      api.post<{ time_log: TimeLog }>(`/admin/issues/${issueId}/time-logs`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeLogKeys.byIssue(issueId) })
    },
  })
}

export function useStartTimer(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ time_log: TimeLog }>(`/admin/issues/${issueId}/time-logs/timer`, {
        action: "start",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeLogKeys.activeTimer(issueId) })
      qc.invalidateQueries({ queryKey: timeLogKeys.byIssue(issueId) })
    },
  })
}

export function useStopTimer(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ time_log: TimeLog }>(`/admin/issues/${issueId}/time-logs/timer`, {
        action: "stop",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeLogKeys.activeTimer(issueId) })
      qc.invalidateQueries({ queryKey: timeLogKeys.byIssue(issueId) })
    },
  })
}

export function useDeleteTimeLog(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: string) =>
      api.delete<{ time_log: TimeLog }>(`/admin/issues/${issueId}/time-logs/${logId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeLogKeys.byIssue(issueId) })
    },
  })
}
