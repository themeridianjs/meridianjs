import { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { format } from "date-fns"
import { Users, GitBranch, Clock, CalendarRange, BarChart2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useReportingTimeLogs } from "@/api/hooks/useReporting"
import { useUserMap, useUsers } from "@/api/hooks/useUsers"
import { DatePicker } from "@/components/ui/date-picker"
import { MultiSelect } from "@/components/ui/multi-select"
import { Skeleton } from "@/components/ui/skeleton"

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-0.5">{label}</p>
      <p className="text-muted-foreground">{formatMinutes(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

export function ProjectReportsPage() {
  const { projectKey, workspace: ws } = useParams<{ projectKey: string; workspace: string }>()
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: project } = useProjectByKey(projectKey ?? "")
  const { data: userMap } = useUserMap()
  const { data: users = [] } = useUsers()

  const fromStr = from ? format(from, "yyyy-MM-dd") : undefined
  const toStr = to ? format(to, "yyyy-MM-dd") : undefined

  const { data, isLoading } = useReportingTimeLogs({
    project_id: project?.id,
    from: fromStr,
    to: toStr,
  })

  // Filter client-side by selected employees
  const allLogs = data?.time_logs ?? []
  const timeLogs = useMemo(
    () =>
      selectedUserIds.length > 0
        ? allLogs.filter((l) => selectedUserIds.includes(l.user_id))
        : allLogs,
    [allLogs, selectedUserIds]
  )

  const totalMinutes = useMemo(
    () => timeLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
    [timeLogs]
  )

  // Group by user_id
  const byUser = useMemo(() => {
    const map = new Map<string, { logs: typeof timeLogs; totalMinutes: number }>()
    for (const log of timeLogs) {
      if (!map.has(log.user_id)) map.set(log.user_id, { logs: [], totalMinutes: 0 })
      const e = map.get(log.user_id)!
      e.logs.push(log)
      e.totalMinutes += log.duration_minutes ?? 0
    }
    return map
  }, [timeLogs])

  // Group by issue_id
  const byIssue = useMemo(() => {
    const map = new Map<string, { logs: typeof timeLogs; totalMinutes: number }>()
    for (const log of timeLogs) {
      if (!map.has(log.issue_id)) map.set(log.issue_id, { logs: [], totalMinutes: 0 })
      const e = map.get(log.issue_id)!
      e.logs.push(log)
      e.totalMinutes += log.duration_minutes ?? 0
    }
    return map
  }, [timeLogs])

  // Chart data
  const userChartData = Array.from(byUser.entries())
    .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
    .slice(0, 8)
    .map(([userId, { totalMinutes: mins }]) => ({
      name: userMap?.get(userId)?.name ?? "Unknown",
      minutes: mins,
    }))

  const issueChartData = Array.from(byIssue.entries())
    .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
    .slice(0, 8)
    .map(([issueId, { totalMinutes: mins, logs }]) => ({
      name: logs[0]?.issue_identifier ?? issueId.slice(0, 8),
      minutes: mins,
    }))

  // Multi-select options: users who have logged time + all workspace users
  const employeeOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      })),
    [users]
  )

  const hasData = timeLogs.length > 0

  return (
    <div className="p-2 space-y-2">
      {/* Filters bar */}
      <div className="bg-white dark:bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <CalendarRange className="h-3.5 w-3.5" />
          <span className="font-medium">Date range</span>
        </div>
        <DatePicker value={from} onChange={setFrom} placeholder="From" />
        <span className="text-xs text-muted-foreground">→</span>
        <DatePicker value={to} onChange={setTo} placeholder="To" />

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">Employee</span>
        </div>
        <MultiSelect
          options={employeeOptions}
          selected={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          placeholder="All employees"
          className="w-44"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total logged", value: totalMinutes > 0 ? formatMinutes(totalMinutes) : "—", icon: Clock },
          { label: "Contributors", value: byUser.size > 0 ? String(byUser.size) : "—", icon: Users },
          { label: "Issues tracked", value: byIssue.size > 0 ? String(byIssue.size) : "—", icon: GitBranch },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-card border border-border rounded-xl px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : !project?.id ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No time logged</p>
          <p className="text-sm text-muted-foreground">
            {fromStr || toStr || selectedUserIds.length > 0
              ? "No entries match the current filters."
              : "Start logging time on issues to see reports here."}
          </p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Time by user chart */}
            {byUser.size > 0 && (
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time by user</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(100, userChartData.length * 36)}>
                  <BarChart data={userChartData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatMinutes(v)}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Time by issue chart */}
            {byIssue.size > 0 && (
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time by issue</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(100, issueChartData.length * 36)}>
                  <BarChart data={issueChartData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatMinutes(v)}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={64}
                      tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="minutes" fill="#818cf8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Time by user table */}
          <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time by user</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="text-right px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Issues</th>
                  <th className="text-right px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from(byUser.entries())
                  .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
                  .map(([userId, { logs, totalMinutes: userTotal }]) => {
                    const user = userMap?.get(userId)
                    const issueCount = new Set(logs.map((l) => l.issue_id)).size
                    return (
                      <tr key={userId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium">{user?.name ?? userId.slice(0, 8) + "…"}</td>
                        <td className="px-6 py-3 text-xs text-right text-muted-foreground tabular-nums">{issueCount}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums font-semibold">{formatMinutes(userTotal)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Time by issue table */}
          <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time by issue</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Issue</th>
                  <th className="text-left px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last logged</th>
                  <th className="text-right px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Contributors</th>
                  <th className="text-right px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from(byIssue.entries())
                  .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
                  .map(([issueId, { logs, totalMinutes: issueTotal }]) => {
                    const contributors = new Set(logs.map((l) => l.user_id)).size
                    const lastDate = logs.reduce((latest, l) => {
                      if (!l.logged_date) return latest
                      return !latest || new Date(l.logged_date) > new Date(latest) ? l.logged_date : latest
                    }, null as string | null)
                    const identifier = logs[0]?.issue_identifier
                    const title = logs[0]?.issue_title
                    return (
                      <tr key={issueId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {identifier ? (
                              <Link
                                to={`/${ws}/projects/${projectKey}/issues/${issueId}`}
                                className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                              >
                                {identifier}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">{issueId.slice(0, 8)}…</span>
                            )}
                            {title && (
                              <span className="text-xs text-muted-foreground truncate">{title}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {lastDate ? format(new Date(lastDate), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-6 py-3 text-xs text-right text-muted-foreground tabular-nums">{contributors}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums font-semibold">{formatMinutes(issueTotal)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
