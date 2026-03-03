import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import {
  Search, ArrowUp, ArrowDown, Minus, Zap, Circle,
  ChevronRight, ChevronDown, ListTree, Layers,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format, addDays } from "date-fns"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  GanttProvider, GanttSidebar, GanttSidebarGroup, GanttSidebarItem,
  GanttTimeline, GanttHeader, GanttFeatureList, GanttFeatureListGroup,
  GanttFeatureItem, GanttToday, GanttMarker,
} from "@/components/kibo-ui/gantt"
import type { GanttFeature, Range } from "@/components/kibo-ui/gantt"
import { usePublicProject, usePublicIssues, usePublicSprints } from "@/api/hooks/usePublicProject"
import type { Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { ISSUE_PRIORITY_LABELS, ISSUE_PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

// ─── Shared types ──────────────────────────────────────────────────────────────

interface Assignee { id: string; name: string; initials: string }
type PublicIssue = Issue & { assignees?: Assignee[] }

// ─── Priority icon (matches authenticated view) ────────────────────────────────

function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  const cls = cn("h-3.5 w-3.5 shrink-0", ISSUE_PRIORITY_COLORS[priority], className)
  switch (priority) {
    case "urgent":  return <Zap       className={cls} />
    case "high":    return <ArrowUp   className={cls} />
    case "medium":  return <Minus     className={cls} />
    case "low":     return <ArrowDown className={cls} />
    default:        return <Circle    className={cn("h-3.5 w-3.5 shrink-0 text-zinc-300", className)} />
  }
}

// ─── Grid layout (same as authenticated view, minus the 32px actions column) ──

const GRID = "grid-cols-[70px_250px_150px_120px_130px_140px_130px]"

// ─── Read-only issue row ───────────────────────────────────────────────────────

interface PublicIssueRowProps {
  issue: PublicIssue
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: any[]
  isChild?: boolean
  children?: PublicIssue[]
  childrenMap?: Record<string, PublicIssue[]>
}

function PublicIssueRow({
  issue, statuses, statusLabels, statusColorMap, sprints,
  isChild = false, children = [], childrenMap,
}: PublicIssueRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = children.length > 0
  const statusColor = statusColorMap[issue.status] ?? "#94a3b8"
  const activeSprint = sprints.find((s: any) => s.id === issue.sprint_id)

  return (
    <>
      <div
        className={cn(
          `group grid ${GRID} items-center py-3`,
          "hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors",
          isChild && "bg-muted/10",
        )}
      >
        {/* ID */}
        <span className={cn(
          "text-xs font-mono text-muted-foreground truncate",
          "sticky left-0 z-10 pl-6 transition-colors",
          "bg-white dark:bg-card group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30",
          isChild && "text-muted-foreground/60",
        )}>
          {issue.identifier}
        </span>

        {/* Title with expand/collapse */}
        <div className={cn(
          "flex items-center gap-1 min-w-0 pr-3",
          "sticky left-[70px] z-10 transition-colors",
          "bg-white dark:bg-card group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30",
          isChild && "bg-[#f8f9fa] dark:bg-muted/20",
        )}>
          {hasChildren ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                >
                  {expanded
                    ? <ChevronDown  className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{expanded ? "Collapse" : "Expand"}</TooltipContent>
            </Tooltip>
          ) : isChild ? (
            <ListTree className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className={cn("text-sm text-foreground truncate", isChild && "text-muted-foreground")}>
            {issue.title}
          </span>
          {hasChildren && (
            <span className="shrink-0 flex items-center gap-0.5 ml-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
              <ListTree className="h-2.5 w-2.5" />
              {children.length}
            </span>
          )}
        </div>

        {/* Status — read-only */}
        <div className="flex items-center gap-1.5 px-1.5 py-1 max-w-full">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
          <span className="text-xs text-muted-foreground truncate">
            {statusLabels[issue.status] ?? issue.status}
          </span>
        </div>

        {/* Priority — read-only */}
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          <PriorityIcon priority={issue.priority} />
          <span className="text-xs text-muted-foreground">
            {ISSUE_PRIORITY_LABELS[issue.priority] ?? issue.priority}
          </span>
        </div>

        {/* Sprint — read-only */}
        <div className="flex items-center gap-1.5 px-1.5 py-1 max-w-full">
          <Layers className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className={cn("text-xs truncate", activeSprint ? "text-foreground" : "text-muted-foreground/50")}>
            {activeSprint?.name ?? "—"}
          </span>
        </div>

        {/* Due date — read-only */}
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className={cn("text-xs", issue.due_date ? "text-foreground" : "text-muted-foreground/50")}>
            {issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "—"}
          </span>
        </div>

        {/* Assignees — read-only */}
        <div className="flex items-center px-1.5">
          <div className="flex -space-x-1.5">
            {(issue.assignees ?? []).slice(0, 3).map((a) => (
              <div
                key={a.id}
                title={a.name}
                className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900 border border-white dark:border-card flex items-center justify-center text-[10px] font-medium text-indigo-700 dark:text-indigo-300"
              >
                {a.initials}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Children (expanded) */}
      {expanded && children.map((child) => (
        <PublicIssueRow
          key={child.id}
          issue={child}
          statuses={statuses}
          statusLabels={statusLabels}
          statusColorMap={statusColorMap}
          sprints={sprints}
          isChild
          children={childrenMap?.[child.id] ?? []}
          childrenMap={childrenMap}
        />
      ))}
    </>
  )
}

// ─── Collapsible section ───────────────────────────────────────────────────────

interface PublicIssuesSectionProps {
  issues: PublicIssue[]
  childrenMap: Record<string, PublicIssue[]>
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: any[]
  totalCount: number
}

function PublicIssuesSection({
  issues, childrenMap, statuses, statusLabels, statusColorMap, sprints, totalCount,
}: PublicIssuesSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronDown  className="h-3.5 w-3.5" />}
        </button>
        <span className="text-xs font-semibold text-muted-foreground">Issues</span>
        <span className="text-[11px] text-muted-foreground/60 font-mono">{totalCount}</span>
      </div>

      {!collapsed && (
        <div className="divide-y divide-border/60">
          {issues.length === 0 ? (
            <div className="px-14 py-5 text-xs text-muted-foreground/50 italic">
              No issues match your filters
            </div>
          ) : (
            issues.map((issue) => (
              <PublicIssueRow
                key={issue.id}
                issue={issue}
                statuses={statuses}
                statusLabels={statusLabels}
                statusColorMap={statusColorMap}
                sprints={sprints}
                children={childrenMap[issue.id] ?? []}
                childrenMap={childrenMap}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Issues view ───────────────────────────────────────────────────────────────

interface PublicIssuesViewProps {
  token: string
  statuses: ProjectStatus[]
}

function PublicIssuesView({ token, statuses }: PublicIssuesViewProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")
  const [search, setSearch] = useState("")

  const { data: rawIssues = [], isLoading } = usePublicIssues(token)
  const { data: sprints = [] } = usePublicSprints(token)

  const statusLabels  = Object.fromEntries(statuses.map((s) => [s.key, s.name]))
  const statusColorMap = Object.fromEntries(statuses.map((s) => [s.key, s.color]))

  // Build parent→children map from all issues
  const childrenMap: Record<string, PublicIssue[]> = {}
  for (const issue of rawIssues as PublicIssue[]) {
    if (issue.parent_id) {
      if (!childrenMap[issue.parent_id]) childrenMap[issue.parent_id] = []
      childrenMap[issue.parent_id].push(issue)
    }
  }

  // Filter + sort top-level issues
  const topLevel = (rawIssues as PublicIssue[])
    .filter((i) => !i.parent_id)
    .filter((i) => {
      const q = search.toLowerCase()
      const matchSearch = !search || i.title.toLowerCase().includes(q) || i.identifier.toLowerCase().includes(q)
      const matchStatus   = statusFilter   === "all" || i.status   === statusFilter
      const matchPriority = priorityFilter === "all" || i.priority === priorityFilter
      const matchSprint   =
        sprintFilter === "all"  ? true :
        sprintFilter === "none" ? !i.sprint_id :
        i.sprint_id === sprintFilter
      return matchSearch && matchStatus && matchPriority && matchSprint
    })
    .sort((a, b) => {
      const aNum = parseInt(a.identifier.split("-")[1] ?? "0", 10)
      const bNum = parseInt(b.identifier.split("-")[1] ?? "0", 10)
      return aNum - bNum
    })

  const totalChildCount = topLevel.reduce((s, i) => s + (childrenMap[i.id]?.length ?? 0), 0)
  const totalCount = topLevel.length + totalChildCount

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-transparent">
                <SelectValue placeholder="Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"  className="text-xs">All sprints</SelectItem>
                <SelectItem value="none" className="text-xs text-muted-foreground">No sprint</SelectItem>
                {(sprints as any[]).map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-transparent">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {statuses.map(({ key, name }) => (
                  <SelectItem key={key} value={key} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-transparent">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All priorities</SelectItem>
                {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-[200px] text-xs bg-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Column headers */}
            <div className={cn("grid items-center py-2.5 border-b border-border", GRID)}>
              <span className="text-xs font-medium text-[#6b7280] sticky left-0 z-10 bg-white dark:bg-card pl-6">ID</span>
              <span className="text-xs font-medium text-[#6b7280] sticky left-[70px] z-10 bg-white dark:bg-card">Title</span>
              <span className="text-xs font-medium text-[#6b7280]">Status</span>
              <span className="text-xs font-medium text-[#6b7280]">Priority</span>
              <span className="text-xs font-medium text-[#6b7280]">Sprint</span>
              <span className="text-xs font-medium text-[#6b7280]">Due Date</span>
              <span className="text-xs font-medium text-[#6b7280]">Assignees</span>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn("grid items-center px-6 py-3 gap-4", GRID)}>
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (rawIssues as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium mb-1">No issues yet</p>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <PublicIssuesSection
                  issues={topLevel}
                  childrenMap={childrenMap}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  sprints={sprints as any[]}
                  totalCount={totalCount}
                />
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {totalCount} issue{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Gantt / Timeline view ─────────────────────────────────────────────────────

function issueToFeature(issue: Issue, statusColor: string): GanttFeature {
  const startAt = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date!)
  const endAt   = issue.due_date   ? addDays(new Date(issue.due_date), 1) : addDays(startAt, 1)
  return {
    id: issue.id,
    name: `${issue.identifier} ${issue.title}`,
    startAt,
    endAt,
    status: { id: issue.status, name: issue.status, color: statusColor },
  }
}

interface PublicGanttViewProps {
  token: string
  statuses: ProjectStatus[]
}

function PublicGanttView({ token, statuses }: PublicGanttViewProps) {
  const [range, setRange] = useState<Range>("monthly")
  const ganttWrapRef = useRef<HTMLDivElement>(null)

  const { data: issues  = [] } = usePublicIssues(token)
  const { data: sprints = [] } = usePublicSprints(token)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const ganttEl = ganttWrapRef.current?.querySelector(".gantt") as HTMLDivElement | null
      if (!ganttEl) return
      const today      = new Date()
      const startYear  = today.getFullYear() - 1
      const SIDEBAR_W  = 300
      let todayPx: number
      if (range === "daily") {
        const diffDays = Math.floor((today.getTime() - new Date(startYear, 0, 1).getTime()) / 86_400_000)
        todayPx = diffDays * 50
      } else {
        const colW = range === "monthly" ? 150 : 100
        const months = (today.getFullYear() - startYear) * 12 + today.getMonth()
        const dpm    = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
        todayPx = months * colW + ((today.getDate() - 1) / dpm) * colW
      }
      ganttEl.scrollLeft = Math.max(0, todayPx - (ganttEl.clientWidth - SIDEBAR_W) / 2)
    })
    return () => cancelAnimationFrame(raf)
  }, [range])

  const statusColorMap   = Object.fromEntries(statuses.map((s) => [s.key, s.color]))
  const scheduledIssues  = (issues as Issue[]).filter((i) => i.due_date)
  const unscheduledIssues = (issues as Issue[]).filter((i) => !i.due_date)

  const sprintMap: Record<string, Issue[]> = {}
  const noSprintIssues: Issue[] = []
  for (const issue of scheduledIssues) {
    if (issue.sprint_id) {
      if (!sprintMap[issue.sprint_id]) sprintMap[issue.sprint_id] = []
      sprintMap[issue.sprint_id].push(issue)
    } else {
      noSprintIssues.push(issue)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center px-6 py-3 border-b border-border shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {(["daily", "monthly", "quarterly"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                range === r
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div ref={ganttWrapRef} className="flex-1 min-h-0 overflow-hidden">
        <GanttProvider range={range} zoom={100} className="h-full bg-white dark:bg-zinc-950">
          <GanttSidebar>
            {(sprints as any[]).map((sprint) => {
              const sprintIssues = sprintMap[sprint.id] ?? []
              return (
                <GanttSidebarGroup key={sprint.id} name={sprint.name}>
                  {sprintIssues.map((issue) => (
                    <GanttSidebarItem
                      key={issue.id}
                      feature={issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")}
                    />
                  ))}
                </GanttSidebarGroup>
              )
            })}
            {noSprintIssues.length > 0 && (
              <GanttSidebarGroup name="No Sprint">
                {noSprintIssues.map((issue) => (
                  <GanttSidebarItem key={issue.id} feature={issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")} />
                ))}
              </GanttSidebarGroup>
            )}
            {unscheduledIssues.length > 0 && (
              <GanttSidebarGroup name="Unscheduled">
                {unscheduledIssues.map((issue) => (
                  <GanttSidebarItem
                    key={issue.id}
                    feature={{ id: issue.id, name: `${issue.identifier} ${issue.title}`, startAt: new Date(), endAt: new Date(), status: { id: issue.status, name: issue.status, color: statusColorMap[issue.status] ?? "#94a3b8" } }}
                  />
                ))}
              </GanttSidebarGroup>
            )}
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />
            <GanttFeatureList>
              {(sprints as any[]).map((sprint) => (
                <GanttFeatureListGroup key={sprint.id}>
                  {(sprintMap[sprint.id] ?? []).map((issue) => (
                    <div key={issue.id} className="flex">
                      <GanttFeatureItem {...issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")} />
                    </div>
                  ))}
                </GanttFeatureListGroup>
              ))}
              {noSprintIssues.length > 0 && (
                <GanttFeatureListGroup>
                  {noSprintIssues.map((issue) => (
                    <div key={issue.id} className="flex">
                      <GanttFeatureItem {...issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")} />
                    </div>
                  ))}
                </GanttFeatureListGroup>
              )}
              {unscheduledIssues.length > 0 && (
                <GanttFeatureListGroup>
                  {unscheduledIssues.map((issue) => (
                    <div key={issue.id} style={{ height: "var(--gantt-row-height)" }} />
                  ))}
                </GanttFeatureListGroup>
              )}
            </GanttFeatureList>

            {(sprints as any[]).filter((s) => s.end_date).map((sprint) => (
              <GanttMarker key={sprint.id} id={sprint.id} date={new Date(sprint.end_date)} label={`${sprint.name} end`} />
            ))}
            <GanttToday />
          </GanttTimeline>
        </GanttProvider>
      </div>
    </div>
  )
}

// ─── Public project page ───────────────────────────────────────────────────────

type Tab = "board" | "issues" | "timeline"

export function PublicProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [tab, setTab] = useState<Tab>("board")

  const { data: project, isLoading, isError } = usePublicProject(token ?? "")
  const { data: issues } = usePublicIssues(token ?? "")

  if (!token) return null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Link not found</p>
        <p className="text-sm text-muted-foreground">This share link is invalid or has been revoked.</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "board",    label: "Board" },
    { key: "issues",   label: "Issues" },
    { key: "timeline", label: "Timeline" },
  ]

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimal header */}
      <header className="border-b border-border px-6 py-3 bg-white dark:bg-card shrink-0">
        <div className="flex items-center gap-3">
          {project.icon && <span className="text-xl">{project.icon}</span>}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
              {project.identifier}
            </span>
            <h1 className="text-sm font-semibold">{project.name}</h1>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">Read-only view</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-border bg-white dark:bg-card px-6 shrink-0">
        <div className="flex -mb-px">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === key
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 min-h-0 ${tab === "timeline" ? "overflow-hidden" : "overflow-auto"}`}>
        {tab === "board" && (
          <KanbanBoard
            issues={(issues ?? []) as Issue[]}
            projectId={project.id}
            statuses={project.statuses}
            readOnly
          />
        )}
        {tab === "issues" && (
          <PublicIssuesView token={token} statuses={project.statuses} />
        )}
        {tab === "timeline" && (
          <PublicGanttView token={token} statuses={project.statuses} />
        )}
      </div>
    </div>
  )
}
