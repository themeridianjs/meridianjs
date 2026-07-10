import { useState, useMemo, Suspense } from "react"
import { useSearchParams } from "react-router-dom"
import { useTeamTasks, type TeamTaskIssue } from "@/api/hooks/useTeamTasks"
import type { MyTasksFilters } from "@/api/hooks/useMyTasks"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useAllUsers } from "@/api/hooks/useUsers"
import { useUserMap } from "@/api/hooks/useUsers"
import { MultiSelect } from "@/components/ui/multi-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_COLORS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Search,
  LayoutGrid,
  List,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Circle,
  Calendar,
  Lock,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { UserSelector } from "@/components/team/UserSelector"
import { TimesheetPage } from "@/pages/TimesheetPage"

// ── Shared helpers ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
}

const PriorityIcon = ({ priority, className }: { priority: string; className?: string }) => {
  const cls = cn("h-3.5 w-3.5 shrink-0", ISSUE_PRIORITY_COLORS[priority], className)
  switch (priority) {
    case "urgent": return <Zap className={cls} />
    case "high": return <ArrowUp className={cls} />
    case "medium": return <Minus className={cls} />
    case "low": return <ArrowDown className={cls} />
    default: return <Circle className={cn("h-3.5 w-3.5 shrink-0 text-zinc-300", className)} />
  }
}

const GRID = "grid-cols-[70px_1fr_100px_140px_100px_110px_32px]"

// ── Task row (privacy-aware) ────────────────────────────────────────────────────

function TeamTaskRow({ issue }: { issue: TeamTaskIssue }) {
  if (issue._private) {
    return (
      <div className={cn(`grid ${GRID} items-center py-3`, "opacity-50")}>
        <span className="text-xs font-mono text-muted-foreground truncate pl-6">---</span>
        <span className="text-sm text-muted-foreground truncate pr-3 italic flex items-center gap-1.5">
          <Lock className="h-3 w-3 shrink-0" />
          Private Issue
        </span>
        <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded truncate w-fit">
          ---
        </span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="pr-6" />
      </div>
    )
  }

  return (
    <div className={cn(`grid ${GRID} items-center py-3`, "hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors")}>
      <span className="text-xs font-mono text-muted-foreground truncate pl-6">
        {issue.identifier}
      </span>
      <span className="text-sm text-foreground truncate pr-3">
        {issue.title}
      </span>
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded truncate w-fit">
        {issue._project?.identifier ?? "—"}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: issue._status.color }} />
        <span className="text-xs text-primary truncate">{issue._status.name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <PriorityIcon priority={issue.priority} />
        <span className="text-xs text-primary">{ISSUE_PRIORITY_LABELS[issue.priority] ?? issue.priority}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className={cn("text-xs", issue.due_date ? "text-foreground" : "text-muted-foreground")}>
          {issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "—"}
        </span>
      </div>
      <span className="pr-6" />
    </div>
  )
}

// ── Kanban card (privacy-aware) ─────────────────────────────────────────────────

function TeamTaskCard({ issue }: { issue: TeamTaskIssue }) {
  const { data: userMap } = useUserMap()

  if (issue._private) {
    return (
      <div className="bg-white dark:bg-card border border-border rounded-lg px-3 py-2.5 opacity-50">
        <p className="text-[13px] text-muted-foreground leading-snug italic flex items-center gap-1.5 mb-2">
          <Lock className="h-3 w-3 shrink-0" />
          Private Issue
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            ---
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white dark:bg-card border border-border rounded-lg px-3 py-2.5",
      "hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors",
    )}>
      <p className="text-[13px] text-foreground leading-snug line-clamp-2 mb-2">
        {issue.title}
      </p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
        <Calendar className="h-2.5 w-2.5 shrink-0" />
        <span>{issue.start_date ? format(new Date(issue.start_date), "MMM d") : "?"}</span>
        <span>→</span>
        <span>{issue.due_date ? format(new Date(issue.due_date), "MMM d") : "?"}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded shrink-0">
            {issue.identifier}
          </span>
          {issue._project && (
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
              {issue._project.identifier}
            </span>
          )}
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: issue._status.color }} />
          <span className="text-[11px] text-muted-foreground truncate">{issue._status.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(issue.assignee_ids ?? []).length > 0 && (
            <div className="flex -space-x-1">
              {(issue.assignee_ids ?? []).slice(0, 2).map((uid) => {
                const u = userMap?.get(uid)
                return (
                  <Avatar key={uid} className="h-4 w-4 border border-background">
                    <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {u?.initials ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                )
              })}
              {(issue.assignee_ids?.length ?? 0) > 2 && (
                <span className="text-[9px] text-muted-foreground ml-1.5 self-center">
                  +{(issue.assignee_ids?.length ?? 0) - 2}
                </span>
              )}
            </div>
          )}
          <PriorityIcon priority={issue.priority} />
        </div>
      </div>
    </div>
  )
}

// ── Kanban board ─────────────────────────────────────────────────────────────────

type Category = "backlog" | "unstarted" | "started" | "completed" | "cancelled"

const CATEGORY_COLUMNS: { key: Category; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "#94a3b8" },
  { key: "unstarted", label: "Unstarted", color: "#64748b" },
  { key: "started", label: "Started", color: "#6366f1" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "cancelled", label: "Cancelled", color: "#9ca3af" },
]

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(148,163,184,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

const CategoryIcon = ({ category, color }: { category: Category; color: string }) => {
  const cls = "h-3.5 w-3.5 shrink-0"
  const style = { color }
  switch (category) {
    case "completed": return <CheckCircle2 className={cls} style={style} />
    case "started": return <Clock className={cls} style={style} />
    default: return <Circle className={cls} style={style} />
  }
}

function TeamTasksKanbanBoard({
  issues,
  categoryCounts,
}: {
  issues: TeamTaskIssue[]
  /** Full-set per-category totals from the server; omit while searching so badges reflect visible cards. */
  categoryCounts?: Record<string, number>
}) {
  const grouped = useMemo(() => {
    const map: Record<string, TeamTaskIssue[]> = {}
    for (const col of CATEGORY_COLUMNS) map[col.key] = []
    for (const issue of issues) {
      const cat = issue._status.category as string
      if (map[cat]) {
        map[cat].push(issue)
      } else {
        map["backlog"].push(issue)
      }
    }
    return map
  }, [issues])

  return (
    <div className="flex gap-4 min-h-full overflow-x-auto px-6 py-4 pb-6">
      {CATEGORY_COLUMNS.map((col) => {
        const colIssues = grouped[col.key]
        const bgColor = hexToRgba(col.color, 0.08)
        return (
          <div key={col.key} className="flex flex-col min-w-[260px] max-w-[280px] w-full">
            <div className="flex items-center gap-2 mb-2 px-1">
              <CategoryIcon category={col.key} color={col.color} />
              <span className="text-xs font-medium text-foreground">{col.label}</span>
              <span
                className="ml-1 text-[11px] font-medium rounded-full px-1.5 py-0.5 tabular-nums min-w-[18px] text-center"
                style={{ backgroundColor: hexToRgba(col.color, 0.12), color: col.color }}
              >
                {categoryCounts ? (categoryCounts[col.key] ?? 0) : colIssues.length}
              </span>
            </div>
            <div
              className="flex-1 flex flex-col gap-2 min-h-[200px] p-2 rounded-xl transition-colors"
              style={{ backgroundColor: bgColor }}
            >
              {colIssues.map((issue) => (
                <TeamTaskCard key={issue.id} issue={issue} />
              ))}
              {colIssues.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[120px]">
                  <p className="text-xs text-muted-foreground/40">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Mobile card (privacy-aware) ─────────────────────────────────────────────────

function TeamTaskMobileCard({ issue }: { issue: TeamTaskIssue }) {
  if (issue._private) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 opacity-50">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate italic">Private Issue</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Private Project</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{issue.identifier}</span>
          <span className="text-sm text-foreground truncate font-medium">{issue.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityIcon priority={issue.priority} />
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: issue._status.color }} />
            {issue._status.name}
          </span>
          {issue._project && (
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              {issue._project.identifier}
            </span>
          )}
          {issue.due_date && (
            <span className="text-[11px] text-muted-foreground">{format(new Date(issue.due_date), "MMM d")}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

export function TeamDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: allUsers } = useAllUsers()

  const selectedUserId = searchParams.get("user") ?? null
  const activeTab = (searchParams.get("tab") as "tasks" | "timesheets") ?? "tasks"

  const setSelectedUserId = (userId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("user", userId)
      return next
    })
  }

  const setActiveTab = (tab: "tasks" | "timesheets") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("tab", tab)
      return next
    })
  }

  // Resolve selected user name for display
  const selectedUser = selectedUserId ? (allUsers ?? []).find((u) => u.id === selectedUserId) : null
  const selectedUserName = selectedUser
    ? `${selectedUser.first_name ?? ""} ${selectedUser.last_name ?? ""}`.trim() || selectedUser.email
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: user selector + tabs */}
      <div className="flex flex-col gap-3 px-6 py-4 border-b border-border shrink-0 bg-white dark:bg-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <UserSelector value={selectedUserId} onChange={setSelectedUserId} />
            {selectedUserName && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Viewing tasks for <span className="font-medium text-foreground">{selectedUserName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              activeTab === "tasks"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("timesheets")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              activeTab === "timesheets"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Timesheets
          </button>
        </div>
      </div>

      {/* Content */}
      {!selectedUserId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium mb-1">Select a team member</p>
            <p className="text-sm text-muted-foreground">Choose a user above to view their tasks and timesheets.</p>
          </div>
        </div>
      ) : activeTab === "tasks" ? (
        <TasksTab userId={selectedUserId} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading...</div>}>
            <TimesheetPage userId={selectedUserId} readOnly />
          </Suspense>
        </div>
      )}
    </div>
  )
}

// ── Tasks tab ───────────────────────────────────────────────────────────────────

function TasksTab({ userId }: { userId: string }) {
  const { data: workspaces } = useWorkspaces()

  const [view, setView] = useState<"list" | "board">(() => {
    return (localStorage.getItem("meridian_team_tasks_view") as "list" | "board") ?? "list"
  })
  const [search, setSearch] = useState("")
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const workspaceOptions = useMemo(
    () => (workspaces ?? []).map((w) => ({ value: w.id, label: w.name })),
    [workspaces],
  )

  const filters: MyTasksFilters = useMemo(() => {
    const f: MyTasksFilters = {}
    if (selectedWorkspaceIds.length > 0) f.workspace_id = selectedWorkspaceIds
    if (priorityFilter !== "all") f.priority = [priorityFilter]
    if (typeFilter !== "all") f.type = [typeFilter]
    if (categoryFilter !== "all") f.category = [categoryFilter]
    return f
  }, [selectedWorkspaceIds, priorityFilter, typeFilter, categoryFilter])

  const {
    issues,
    count,
    categoryCounts,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTeamTasks(userId, filters)

  const toggleView = (v: "list" | "board") => {
    setView(v)
    localStorage.setItem("meridian_team_tasks_view", v)
  }

  const filtered = useMemo(() => {
    if (!search) return issues
    const q = search.toLowerCase()
    return issues.filter((i) => {
      if (i._private) return true // always show private issues
      return (
        i.title.toLowerCase().includes(q) ||
        i.identifier.toLowerCase().includes(q) ||
        (i._project?.identifier ?? "").toLowerCase().includes(q) ||
        (i._project?.name ?? "").toLowerCase().includes(q)
      )
    })
  }, [issues, search])

  const header = (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <span className="text-sm text-muted-foreground">
          {search ? (
            <>{filtered.length} task{filtered.length !== 1 ? "s" : ""} matching</>
          ) : (
            <>{count} task{count !== 1 ? "s" : ""}</>
          )}
          {!search && issues.length < count && (
            <>
              {" · showing "}{issues.length}{" — "}
              <button
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
                className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </>
          )}
        </span>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => toggleView("list")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => toggleView("board")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "board"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 px-4 md:px-6 py-3 border-b border-border md:flex-row md:items-center md:justify-between md:gap-3 shrink-0">
        <div className="flex items-center gap-2 md:overflow-x-auto md:scrollbar-none">
          <MultiSelect
            options={workspaceOptions}
            selected={selectedWorkspaceIds}
            onSelectionChange={setSelectedWorkspaceIds}
            placeholder="All workspaces"
            className="md:w-[160px]"
          />
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[130px] md:shrink-0 bg-transparent">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All priorities</SelectItem>
              {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[130px] md:shrink-0 bg-transparent">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[130px] md:shrink-0 bg-transparent">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-full md:w-[200px] text-xs bg-transparent"
          />
        </div>
      </div>
    </>
  )

  // Board view
  if (view === "board") {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {header}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex gap-4 px-6 py-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="min-w-[260px]">
                  <Skeleton className="h-5 w-24 mb-3 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-[82px] w-full rounded-lg" />
                    <Skeleton className="h-[82px] w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TeamTasksKanbanBoard issues={filtered} categoryCounts={search ? undefined : categoryCounts} />
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {header}

      {/* Desktop list */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          <div className={cn("grid items-center py-2.5 border-b border-border", GRID)}>
            <span className="text-xs font-medium text-[#6b7280] pl-6">ID</span>
            <span className="text-xs font-medium text-[#6b7280]">Title</span>
            <span className="text-xs font-medium text-[#6b7280]">Project</span>
            <span className="text-xs font-medium text-[#6b7280]">Status</span>
            <span className="text-xs font-medium text-[#6b7280]">Priority</span>
            <span className="text-xs font-medium text-[#6b7280]">Due Date</span>
            <span className="pr-6" />
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn("grid items-center px-6 py-3 gap-4", GRID)}>
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <span />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium mb-1">
                {issues.length === 0 ? "No tasks assigned to this user" : "No tasks match your filters"}
              </p>
              <p className="text-sm text-muted-foreground">
                {issues.length === 0
                  ? "Issues assigned to this user will appear here."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((issue) => (
                <TeamTaskRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-border/60">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">No tasks found</p>
          </div>
        ) : (
          filtered.map((issue) => (
            <TeamTaskMobileCard key={issue.id} issue={issue} />
          ))
        )}
      </div>
    </div>
  )
}
