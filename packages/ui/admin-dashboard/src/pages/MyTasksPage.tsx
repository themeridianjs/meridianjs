import { useState, useMemo, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMyTasks, type MyTaskIssue, type MyTasksFilters } from "@/api/hooks/useMyTasks"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { MultiSelect } from "@/components/ui/multi-select"
import { MyTasksKanbanBoard } from "@/components/board/MyTasksKanbanBoard"
import { Skeleton } from "@/components/ui/skeleton"
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
  ExternalLink,
} from "lucide-react"

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

const CATEGORY_LABELS: Record<string, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
}

const GRID = "grid-cols-[70px_1fr_100px_140px_100px_110px_32px]"

function MyTaskRow({
  issue,
  workspace,
  onNavigate,
}: {
  issue: MyTaskIssue
  workspace: string
  onNavigate: (issue: MyTaskIssue) => void
}) {
  const navigate = useNavigate()
  const projectKey = issue._project?.identifier ?? ""

  return (
    <div
      onClick={() => onNavigate(issue)}
      className={cn(
        `group grid ${GRID} items-center py-3`,
        "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors"
      )}
    >
      {/* ID */}
      <span className="text-xs font-mono text-muted-foreground truncate pl-6">
        {issue.identifier}
      </span>

      {/* Title */}
      <span className="text-sm text-foreground truncate pr-3">
        {issue.title}
      </span>

      {/* Project */}
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded truncate w-fit">
        {issue._project?.identifier ?? "—"}
      </span>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: issue._status.color }}
        />
        <span className="text-xs text-primary truncate">
          {issue._status.name}
        </span>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1.5">
        <PriorityIcon priority={issue.priority} />
        <span className="text-xs text-primary">
          {ISSUE_PRIORITY_LABELS[issue.priority] ?? issue.priority}
        </span>
      </div>

      {/* Due date */}
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className={cn("text-xs", issue.due_date ? "text-foreground" : "text-muted-foreground")}>
          {issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "—"}
        </span>
      </div>

      {/* External link */}
      <div className="pr-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)}
          className="p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function MyTasksPage() {
  const navigate = useNavigate()
  const { workspace } = useParams<{ workspace: string }>()
  const ws = workspace ?? ""
  const { workspace: currentWorkspace } = useAuth()
  const { data: workspaces } = useWorkspaces()

  const [view, setView] = useState<"list" | "board">(() => {
    return (localStorage.getItem("meridian_my_tasks_view") as "list" | "board") ?? "list"
  })
  const [search, setSearch] = useState("")
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Default to current workspace on mount
  useEffect(() => {
    if (currentWorkspace?.id && selectedWorkspaceIds.length === 0) {
      setSelectedWorkspaceIds([currentWorkspace.id])
    }
  }, [currentWorkspace?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const workspaceOptions = useMemo(
    () => (workspaces ?? []).map((w) => ({ value: w.id, label: w.name })),
    [workspaces]
  )

  const filters: MyTasksFilters = useMemo(() => {
    const f: MyTasksFilters = {}
    if (selectedWorkspaceIds.length > 0) f.workspace_id = selectedWorkspaceIds
    if (priorityFilter !== "all") f.priority = [priorityFilter]
    if (typeFilter !== "all") f.type = [typeFilter]
    if (categoryFilter !== "all") f.category = [categoryFilter]
    return f
  }, [selectedWorkspaceIds, priorityFilter, typeFilter, categoryFilter])

  const { data: issues, isLoading } = useMyTasks(filters)

  const toggleView = (v: "list" | "board") => {
    setView(v)
    localStorage.setItem("meridian_my_tasks_view", v)
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!issues) return []
    if (!search) return issues
    const q = search.toLowerCase()
    return issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.identifier.toLowerCase().includes(q) ||
        (i._project?.identifier ?? "").toLowerCase().includes(q) ||
        (i._project?.name ?? "").toLowerCase().includes(q)
    )
  }, [issues, search])

  const handleIssueClick = (issue: MyTaskIssue) => {
    const projectKey = issue._project?.identifier
    if (projectKey) {
      navigate(`/${ws}/projects/${projectKey}/issues/${issue.id}`)
    }
  }

  const header = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-foreground">My Tasks</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => toggleView("list")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
                : "text-muted-foreground hover:text-foreground"
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

  // Board view — full-height flex layout matching ProjectBoardPage
  if (view === "board") {
    return (
      <div className="flex flex-col h-full gap-0">
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-card">
          {header}

          {/* Board — only this area scrolls */}
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
              <MyTasksKanbanBoard issues={filtered} onIssueClick={handleIssueClick} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view — scrollable card layout
  return (
    <div className="p-2 pb-24 md:pb-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {header}

        {/* Desktop list */}
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Table header */}
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
                  {(issues ?? []).length === 0 ? "No tasks assigned to you" : "No tasks match your filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(issues ?? []).length === 0
                    ? "Issues assigned to you across all projects will appear here."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map((issue) => (
                  <MyTaskRow
                    key={issue.id}
                    issue={issue}
                    workspace={ws}
                    onNavigate={handleIssueClick}
                  />
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
              <div
                key={issue.id}
                onClick={() => handleIssueClick(issue)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {issue.identifier}
                    </span>
                    <span className="text-sm text-foreground truncate font-medium">
                      {issue.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityIcon priority={issue.priority} />
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: issue._status.color }}
                      />
                      {issue._status.name}
                    </span>
                    {issue._project && (
                      <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                        {issue._project.identifier}
                      </span>
                    )}
                    {issue.due_date && (
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(issue.due_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filtered.length} task{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
