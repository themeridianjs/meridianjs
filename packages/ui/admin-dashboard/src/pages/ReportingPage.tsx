import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { BarChart2, Clock, Users, Layers, CalendarRange } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useReportingTimeLogs } from "@/api/hooks/useReporting"
import { useUsers, useUserMap } from "@/api/hooks/useUsers"
import { useProjects } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
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

export function ReportingPage() {
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])

  const { workspace } = useAuth()
  const ws = workspace?.slug ?? ""

  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const { data: userMap } = useUserMap()

  const fromStr = from ? format(from, "yyyy-MM-dd") : undefined
  const toStr = to ? format(to, "yyyy-MM-dd") : undefined

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const { data, isLoading } = useReportingTimeLogs(
    { from: fromStr, to: toStr },
    { enabled: true }
  )

  const allLogs = data?.time_logs ?? []

  // Client-side filtering by employee and project
  const timeLogs = useMemo(() => {
    let logs = allLogs
    if (selectedUserIds.length > 0) {
      logs = logs.filter((l) => selectedUserIds.includes(l.user_id))
    }
    if (selectedProjectIds.length > 0) {
      logs = logs.filter((l) => l.project_id && selectedProjectIds.includes(l.project_id))
    }
    return logs
  }, [allLogs, selectedUserIds, selectedProjectIds])

  const totalMinutes = timeLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)

  const uniqueEmployeeCount = useMemo(() => new Set(timeLogs.map((l) => l.user_id)).size, [timeLogs])
  const uniqueProjectCount = useMemo(
    () => new Set(timeLogs.map((l) => l.project_id).filter(Boolean)).size,
    [timeLogs]
  )

  // Chart: time by employee (top 8)
  const byEmployeeChart = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of timeLogs) {
      map.set(log.user_id, (map.get(log.user_id) ?? 0) + (log.duration_minutes ?? 0))
    }
    return Array.from(map.entries())
      .map(([userId, minutes]) => ({
        name: userMap?.get(userId)?.name ?? "Unknown",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8)
  }, [timeLogs, userMap])

  // Chart: time by project (top 8)
  const byProjectChart = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of timeLogs) {
      const key = log.project_id ?? "__none__"
      map.set(key, (map.get(key) ?? 0) + (log.duration_minutes ?? 0))
    }
    return Array.from(map.entries())
      .map(([key, minutes]) => ({
        name: key === "__none__" ? "No project" : (projectMap.get(key)?.name ?? "Unknown"),
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8)
  }, [timeLogs, projectMap])

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      })),
    [users]
  )

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects]
  )

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="bg-white dark:bg-card border border-border rounded-xl px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Time Logs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Filter by date range, employees, and projects to analyze time across the organization.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <CalendarRange className="h-3.5 w-3.5" />
          <span className="font-medium">Date range</span>
        </div>
        <DatePicker value={from} onChange={setFrom} placeholder="From" />
        <span className="text-xs text-muted-foreground">→</span>
        <DatePicker value={to} onChange={setTo} placeholder="To" />

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">Employees</span>
        </div>
        {usersLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <MultiSelect
            options={userOptions}
            selected={selectedUserIds}
            onSelectionChange={setSelectedUserIds}
            placeholder="All employees"
            className="w-44"
          />
        )}

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Layers className="h-3.5 w-3.5" />
          <span className="font-medium">Projects</span>
        </div>
        {projectsLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <MultiSelect
            options={projectOptions}
            selected={selectedProjectIds}
            onSelectionChange={setSelectedProjectIds}
            placeholder="All projects"
            className="w-44"
          />
        )}
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      ) : timeLogs.length === 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No time logs found</p>
          <p className="text-sm text-muted-foreground">
            {fromStr || toStr || selectedUserIds.length > 0 || selectedProjectIds.length > 0
              ? "Try adjusting your filters."
              : "No time has been logged yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-card border border-border rounded-xl px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Total time</p>
              <p className="text-2xl font-bold tabular-nums">{formatMinutes(totalMinutes)}</p>
            </div>
            <div className="bg-white dark:bg-card border border-border rounded-xl px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Employees</p>
              <p className="text-2xl font-bold tabular-nums">{uniqueEmployeeCount}</p>
            </div>
            <div className="bg-white dark:bg-card border border-border rounded-xl px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Projects</p>
              <p className="text-2xl font-bold tabular-nums">{uniqueProjectCount}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-2">
            {byEmployeeChart.length > 0 && (
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Time by employee
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(80, byEmployeeChart.length * 36)}>
                  <BarChart data={byEmployeeChart} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
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
                      width={100}
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

            {byProjectChart.length > 0 && (
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Time by project
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(80, byProjectChart.length * 36)}>
                  <BarChart data={byProjectChart} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
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
                      width={100}
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
          </div>

          {/* Flat table */}
          <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="text-left px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Project
                  </th>
                  <th className="text-left px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Issue
                  </th>
                  <th className="text-left px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timeLogs.map((log) => {
                  const proj = log.project_id ? projectMap.get(log.project_id) : undefined
                  const userName = userMap?.get(log.user_id)?.name ?? log.user_id.slice(0, 8) + "…"
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium">{userName}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {proj?.name ?? (log.project_id ? "Unknown" : "—")}
                      </td>
                      <td className="px-6 py-3">
                        {log.issue_identifier ? (
                          <Link
                            to={`/${ws}/projects/${proj?.identifier}/issues/${log.issue_id}`}
                            className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {log.issue_identifier}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.issue_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {log.logged_date ? format(new Date(log.logged_date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground truncate max-w-xs">
                        {log.description ?? <span className="italic">—</span>}
                      </td>
                      <td className="px-6 py-3 text-xs text-right tabular-nums font-semibold">
                        {log.duration_minutes != null ? formatMinutes(log.duration_minutes) : "Running…"}
                      </td>
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
