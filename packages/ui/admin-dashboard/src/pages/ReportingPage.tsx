import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { BarChart2, Clock, Users, Layers, CalendarRange, Building2, ChevronLeft, ChevronRight } from "lucide-react"
import { useReportingTimeLogs } from "@/api/hooks/useReporting"
import { useUserMap } from "@/api/hooks/useUsers"
import { useProjects } from "@/api/hooks/useProjects"
import { useReportingMembers } from "@/api/hooks/useReportingFilters"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { DatePicker } from "@/components/ui/date-picker"
import { MultiSelect } from "@/components/ui/multi-select"
import { Skeleton } from "@/components/ui/skeleton"
import { ReportBarChart, formatMinutes } from "@/components/reports/ReportBarChart"

const PAGE_SIZE = 200

export function ReportingPage({ workspaceId }: { workspaceId?: string }) {
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])
  const [offset, setOffset] = useState(0)

  const { workspace } = useAuth()
  const ws = workspace?.slug ?? ""

  // Cascading: workspace → project → employee
  const { data: projects = [], isLoading: projectsLoading } = useProjects(
    workspaceId
      ? undefined
      : selectedWorkspaceIds.length > 0
        ? { workspaceIds: selectedWorkspaceIds }
        : { allWorkspaces: true }
  )
  const { data: members = [], isLoading: membersLoading } = useReportingMembers(
    workspaceId ? [workspaceId] : selectedWorkspaceIds,
    selectedProjectIds
  )
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces()
  const { data: userMap } = useUserMap()

  // Prune stale child selections when parent options change
  useEffect(() => {
    const validProjectIds = new Set(projects.map((p) => p.id))
    setSelectedProjectIds((prev) => {
      const pruned = prev.filter((id) => validProjectIds.has(id))
      return pruned.length === prev.length ? prev : pruned
    })
  }, [projects])

  useEffect(() => {
    const validUserIds = new Set(members.map((m) => m.id))
    setSelectedUserIds((prev) => {
      const pruned = prev.filter((id) => validUserIds.has(id))
      return pruned.length === prev.length ? prev : pruned
    })
  }, [members])

  // Reset pagination when filters change
  useEffect(() => { setOffset(0) }, [from, to, selectedUserIds, selectedProjectIds, selectedWorkspaceIds])

  const fromStr = from ? format(from, "yyyy-MM-dd") : undefined
  const toStr = to ? format(to, "yyyy-MM-dd") : undefined

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const effectiveWsIds = workspaceId
    ? [workspaceId]
    : selectedWorkspaceIds.length > 0
      ? selectedWorkspaceIds
      : undefined

  const { data, isLoading } = useReportingTimeLogs(
    {
      from: fromStr,
      to: toStr,
      workspace_id: workspaceId,
      workspace_ids: effectiveWsIds,
      user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      project_ids: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      limit: PAGE_SIZE,
      offset,
    },
    { enabled: true }
  )

  const timeLogs = useMemo(() => {
    const logs = data?.time_logs ?? []
    // Still scope to accessible projects via projectMap (client-side access filter)
    if (!projectsLoading) {
      return logs.filter((l) => !l.project_id || projectMap.has(l.project_id))
    }
    return logs
  }, [data?.time_logs, projectMap, projectsLoading])

  // Use server-provided aggregates for summary cards
  const totalMinutes = data?.total_minutes ?? 0
  const uniqueEmployeeCount = data?.total_employees ?? 0
  const uniqueProjectCount = data?.total_projects ?? 0
  const totalCount = data?.count ?? 0

  // Chart: time by employee (top 8) — computed from current page
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

  // Chart: time by project (top 8) — computed from current page
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
      members.map((u) => ({
        value: u.id,
        label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      })),
    [members]
  )

  const workspaceOptions = useMemo(
    () => workspaces.map((w) => ({ value: w.id, label: w.name })),
    [workspaces]
  )

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects]
  )

  const hasNextPage = offset + PAGE_SIZE < totalCount
  const hasPrevPage = offset > 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

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
      <div className="bg-white dark:bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="font-medium">Date range</span>
          </div>
          <DatePicker value={from} onChange={setFrom} placeholder="From" />
          <span className="text-xs text-muted-foreground shrink-0">&rarr;</span>
          <DatePicker value={to} onChange={setTo} placeholder="To" />
        </div>

        {!workspaceId && (
          <>
            <div className="hidden md:block w-px h-5 bg-border mx-1 shrink-0" />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium">Workspaces</span>
              </div>
              {workspacesLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <MultiSelect
                  options={workspaceOptions}
                  selected={selectedWorkspaceIds}
                  onSelectionChange={setSelectedWorkspaceIds}
                  placeholder="All workspaces"
                  className="w-44"
                />
              )}
            </div>
          </>
        )}

        <div className="hidden md:block w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">Employees</span>
          </div>
          {membersLoading ? (
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
        </div>

        <div className="hidden md:block w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-2">
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
      ) : timeLogs.length === 0 && offset === 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No time logs found</p>
          <p className="text-sm text-muted-foreground">
            {fromStr || toStr || selectedUserIds.length > 0 || selectedProjectIds.length > 0 || selectedWorkspaceIds.length > 0
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
            <ReportBarChart
              data={byEmployeeChart}
              icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
              title="Time by employee"
            />
            <ReportBarChart
              data={byProjectChart}
              icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />}
              title="Time by project"
            />
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {totalCount} total log{totalCount !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasPrevPage}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={!hasNextPage}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
