import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, useUpdateIssue, type Issue } from "@/api/hooks/useIssues"
import { useProjectStatuses, type ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_COLORS,
} from "@/lib/constants"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Circle,
  ExternalLink,
  Check,
  Calendar as CalendarIcon,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// ─── Shared sub-components ───────────────────────────────────────────────────

const PriorityIcon = ({ priority, className }: { priority: string; className?: string }) => {
  const cls = cn("h-3.5 w-3.5 shrink-0", ISSUE_PRIORITY_COLORS[priority], className)
  switch (priority) {
    case "urgent":  return <Zap className={cls} />
    case "high":    return <ArrowUp className={cls} />
    case "medium":  return <Minus className={cls} />
    case "low":     return <ArrowDown className={cls} />
    default:        return <Circle className={cn("h-3.5 w-3.5 shrink-0 text-zinc-300", className)} />
  }
}

// ─── IssueRow ─────────────────────────────────────────────────────────────────
// Extracted into its own component so it can call useUpdateIssue as a hook.

interface IssueRowProps {
  issue: Issue
  projectId: string
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string> | null
  workspace: string
  projectKey: string
  onOpen: (issue: Issue) => void
}

function IssueRow({
  issue,
  projectId,
  statuses,
  statusLabels,
  statusColorMap,
  workspace,
  projectKey,
  onOpen,
}: IssueRowProps) {
  const navigate = useNavigate()
  const [openPopover, setOpenPopover] = useState<"status" | "priority" | "due" | null>(null)
  const update = useUpdateIssue(issue.id, projectId)

  function save(data: { status?: string; priority?: string; due_date?: string | null; assignee_ids?: string[] }) {
    update.mutate(data as any)
    setOpenPopover(null)
  }

  const statusColor = statusColorMap?.[issue.status] ?? "#94a3b8"
  const isPending = update.isPending

  return (
    <div
      onClick={() => onOpen(issue)}
      className={cn(
        "group grid grid-cols-[70px_1fr_150px_120px_140px_150px_110px_32px] items-center px-6 py-3",
        "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors",
        isPending && "opacity-70"
      )}
    >
      {/* ID */}
      <span className="text-xs font-mono text-muted-foreground truncate">
        {issue.identifier}
      </span>

      {/* Title */}
      <span className="text-sm text-foreground truncate pr-3">
        {issue.title}
      </span>

      {/* ── Status ────────────────────────────────────────────────────────── */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover
          open={openPopover === "status"}
          onOpenChange={(o) => setOpenPopover(o ? "status" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 max-w-full px-1.5 py-1 rounded hover:bg-accent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {statusLabels[issue.status] ?? issue.status}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="start" onClick={(e) => e.stopPropagation()}>
            <Command>
              <CommandList>
                <CommandGroup>
                  {statuses.map((s) => (
                    <CommandItem
                      key={s.key}
                      value={s.name}
                      onSelect={() => save({ status: s.key })}
                      className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-xs flex-1">{s.name}</span>
                      {issue.status === s.key && (
                        <Check className="h-3.5 w-3.5 text-indigo-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Priority ──────────────────────────────────────────────────────── */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover
          open={openPopover === "priority"}
          onOpenChange={(o) => setOpenPopover(o ? "priority" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <PriorityIcon priority={issue.priority} />
              <span className="text-xs text-muted-foreground">
                {ISSUE_PRIORITY_LABELS[issue.priority] ?? issue.priority}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start" onClick={(e) => e.stopPropagation()}>
            <Command>
              <CommandList>
                <CommandGroup>
                  {Object.entries(ISSUE_PRIORITY_LABELS).map(([key, label]) => (
                    <CommandItem
                      key={key}
                      value={label}
                      onSelect={() => save({ priority: key })}
                      className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                    >
                      <PriorityIcon priority={key} />
                      <span className="text-xs flex-1">{label}</span>
                      {issue.priority === key && (
                        <Check className="h-3.5 w-3.5 text-indigo-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Due Date ──────────────────────────────────────────────────────── */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover
          open={openPopover === "due"}
          onOpenChange={(o) => setOpenPopover(o ? "due" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent transition-colors",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={cn(
                "text-xs",
                issue.due_date ? "text-foreground" : "text-muted-foreground"
              )}>
                {issue.due_date
                  ? format(new Date(issue.due_date), "MMM d, yyyy")
                  : "No due date"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium mb-2">Due date</p>
            <input
              type="date"
              defaultValue={issue.due_date ? issue.due_date.slice(0, 10) : ""}
              className={cn(
                "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm",
                "focus:outline-none focus:ring-1 focus:ring-ring"
              )}
              onChange={(e) => {
                if (e.target.value) save({ due_date: e.target.value })
              }}
            />
            {issue.due_date && (
              <button
                onClick={() => save({ due_date: null })}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
                Clear date
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Assignees ─────────────────────────────────────────────────────── */}
      <div onClick={(e) => e.stopPropagation()}>
        <AssigneeSelector
          value={issue.assignee_ids ?? []}
          onChange={(ids) => update.mutate({ assignee_ids: ids } as any)}
        />
      </div>

      {/* Created */}
      <span className="text-xs text-muted-foreground">
        {format(new Date(issue.created_at), "MMM d, yyyy")}
      </span>

      {/* External link */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground"
        title="Open full page"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── ProjectIssuesPage ────────────────────────────────────────────────────────

export function ProjectIssuesPage() {
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issues, isLoading } = useIssues(projectId || undefined)
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)

  // Merge custom statuses with fallback defaults
  const statuses: ProjectStatus[] =
    projectStatuses && projectStatuses.length > 0
      ? projectStatuses
      : Object.entries(ISSUE_STATUS_LABELS).map(([key, name], i) => ({
          id: key, project_id: projectId, key, name,
          color: { backlog: "#94a3b8", todo: "#64748b", in_progress: "#6366f1", in_review: "#f59e0b", done: "#10b981", cancelled: "#9ca3af" }[key] ?? "#94a3b8",
          category: { backlog: "backlog", todo: "unstarted", in_progress: "started", in_review: "started", done: "completed", cancelled: "cancelled" }[key] as any ?? "backlog",
          position: i,
        }))

  const statusLabels = Object.fromEntries(statuses.map((s) => [s.key, s.name]))
  const statusColorMap = Object.fromEntries(statuses.map((s) => [s.key, s.color]))

  if (!projectKey || !workspace) return null

  const filtered = (issues ?? []).filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.identifier.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter
    const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const GRID = "grid-cols-[70px_1fr_150px_120px_140px_150px_110px_32px]"

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Issues</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-[200px] text-xs bg-transparent"
            />
          </div>
        </div>

        {/* Table header */}
        <div className={cn("grid items-center px-6 py-2.5 border-b border-border", GRID)}>
          <span className="text-xs font-medium text-[#6b7280]">ID</span>
          <span className="text-xs font-medium text-[#6b7280]">Title</span>
          <span className="text-xs font-medium text-[#6b7280]">Status</span>
          <span className="text-xs font-medium text-[#6b7280]">Priority</span>
          <span className="text-xs font-medium text-[#6b7280]">Due Date</span>
          <span className="text-xs font-medium text-[#6b7280]">Assignees</span>
          <span className="text-xs font-medium text-[#6b7280]">Created</span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("grid items-center px-6 py-3 gap-4", GRID)}>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-20" />
                <span />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium mb-1">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "No issues match your filters"
                : "No issues yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first issue to start tracking work."}
            </p>
            {!search && statusFilter === "all" && priorityFilter === "all" && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create issue
              </Button>
            )}
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="divide-y divide-border">
              {filtered.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  workspace={workspace}
                  projectKey={projectKey}
                  onOpen={setSelectedIssue}
                />
              ))}
            </div>
          </TooltipProvider>
        )}

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>1 of 1 pages</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Prev</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Next</Button>
            </div>
          </div>
        )}
      </div>

      <IssueDetail
        issue={selectedIssue}
        projectId={projectId}
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
