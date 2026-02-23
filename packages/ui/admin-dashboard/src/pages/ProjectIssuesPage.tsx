import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, useUpdateIssue, type Issue } from "@/api/hooks/useIssues"
import { useProjectStatuses, type ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { useSprints, type Sprint } from "@/api/hooks/useSprints"
import { useTaskLists, useCreateTaskList, useUpdateTaskList, useDeleteTaskList, type TaskList } from "@/api/hooks/useTaskLists"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_COLORS,
} from "@/lib/constants"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  Layers,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ListTree,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"

// ─── PriorityIcon ─────────────────────────────────────────────────────────────

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

interface IssueRowProps {
  issue: Issue
  projectId: string
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string> | null
  sprints: Sprint[]
  workspace: string
  projectKey: string
  onOpen: (issue: Issue) => void
  isChild?: boolean
  children?: Issue[]
  onAddChild?: (parentId: string) => void
}

function IssueRow({
  issue,
  projectId,
  statuses,
  statusLabels,
  statusColorMap,
  sprints,
  workspace,
  projectKey,
  onOpen,
  isChild = false,
  children = [],
  onAddChild,
}: IssueRowProps) {
  const navigate = useNavigate()
  const [openPopover, setOpenPopover] = useState<"status" | "priority" | "due" | "sprint" | null>(null)
  const [expanded, setExpanded] = useState(false)
  const update = useUpdateIssue(issue.id, projectId)

  function save(data: { status?: string; priority?: string; due_date?: string | null; sprint_id?: string | null; assignee_ids?: string[] }) {
    update.mutate(data as any)
    setOpenPopover(null)
  }

  const statusColor = statusColorMap?.[issue.status] ?? "#94a3b8"
  const activeSprint = sprints.find((s) => s.id === issue.sprint_id)
  const hasChildren = children.length > 0

  return (
    <>
      <div
        onClick={() => onOpen(issue)}
        className={cn(
          "group grid grid-cols-[70px_1fr_150px_120px_130px_140px_130px_32px] items-center px-6 py-3",
          "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors",
          isChild && "pl-14 bg-muted/10",
          update.isPending && "opacity-70"
        )}
      >
        {/* ID */}
        <span className={cn("text-xs font-mono text-muted-foreground truncate", isChild && "text-muted-foreground/60")}>
          {issue.identifier}
        </span>

        {/* Title — with expand/collapse for children */}
        <div className="flex items-center gap-1 min-w-0 pr-3">
          {!isChild && hasChildren && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                >
                  {expanded
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{expanded ? "Collapse" : "Expand"}</TooltipContent>
            </Tooltip>
          )}
          {!isChild && !hasChildren && <span className="w-4 shrink-0" />}
          {isChild && <span className="text-muted-foreground/40 shrink-0 text-xs">↳</span>}
          <span className={cn("text-sm text-foreground truncate", isChild && "text-muted-foreground")}>
            {issue.title}
          </span>
          {!isChild && hasChildren && (
            <span className="shrink-0 text-[10px] text-muted-foreground/60 ml-1 font-mono">
              {children.length}
            </span>
          )}
        </div>

        {/* ── Status ── */}
        <div onClick={(e) => e.stopPropagation()}>
          <Popover open={openPopover === "status"} onOpenChange={(o) => setOpenPopover(o ? "status" : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 max-w-full px-1.5 py-1 rounded hover:bg-accent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
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
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs flex-1">{s.name}</span>
                        {issue.status === s.key && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Priority ── */}
        <div onClick={(e) => e.stopPropagation()}>
          <Popover open={openPopover === "priority"} onOpenChange={(o) => setOpenPopover(o ? "priority" : null)}>
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
                        {issue.priority === key && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Sprint ── */}
        <div onClick={(e) => e.stopPropagation()}>
          <Popover open={openPopover === "sprint"} onOpenChange={(o) => setOpenPopover(o ? "sprint" : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-full"
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className={cn("text-xs truncate", activeSprint ? "text-foreground" : "text-muted-foreground")}>
                  {activeSprint?.name ?? "No sprint"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              <Command>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value="no-sprint"
                      onSelect={() => save({ sprint_id: null })}
                      className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs flex-1 text-muted-foreground">No sprint</span>
                      {!issue.sprint_id && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                    </CommandItem>
                    {sprints.filter((s) => s.status !== "completed").map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.name}
                        onSelect={() => save({ sprint_id: s.id })}
                        className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                      >
                        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{s.name}</p>
                          {(s.start_date || s.end_date) && (
                            <p className="text-[10px] text-muted-foreground">
                              {s.start_date ? format(new Date(s.start_date), "MMM d") : "—"}
                              {" → "}
                              {s.end_date ? format(new Date(s.end_date), "MMM d") : "—"}
                            </p>
                          )}
                        </div>
                        {issue.sprint_id === s.id && <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Due Date ── */}
        <div onClick={(e) => e.stopPropagation()}>
          <Popover open={openPopover === "due"} onOpenChange={(o) => setOpenPopover(o ? "due" : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className={cn("text-xs", issue.due_date ? "text-foreground" : "text-muted-foreground")}>
                  {issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "No due date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <Calendar
                mode="single"
                selected={issue.due_date ? new Date(issue.due_date) : undefined}
                onSelect={(date) => save({ due_date: date ? format(date, "yyyy-MM-dd") : null })}
                initialFocus
              />
              {issue.due_date && (
                <div className="border-t px-3 py-2">
                  <button
                    onClick={() => save({ due_date: null })}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear date
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Assignees ── */}
        <div onClick={(e) => e.stopPropagation()}>
          <AssigneeSelector
            value={issue.assignee_ids ?? []}
            onChange={(ids) => update.mutate({ assignee_ids: ids } as any)}
          />
        </div>

        {/* External link + add child */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {!isChild && onAddChild && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAddChild(issue.id)}
                  className="p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground"
                >
                  <ListTree className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Add child issue</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)}
                className="p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Open full page</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Children (expanded) */}
      {!isChild && expanded && children.map((child) => (
        <IssueRow
          key={child.id}
          issue={child}
          projectId={projectId}
          statuses={statuses}
          statusLabels={statusLabels}
          statusColorMap={statusColorMap}
          sprints={sprints}
          workspace={workspace}
          projectKey={projectKey}
          onOpen={onOpen}
          isChild
        />
      ))}
    </>
  )
}

// ─── TaskListGroup ─────────────────────────────────────────────────────────────

interface TaskListGroupProps {
  taskList: TaskList | null  // null = "No List" group
  issues: Issue[]
  childrenMap: Record<string, Issue[]>
  projectId: string
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: Sprint[]
  workspace: string
  projectKey: string
  onOpen: (issue: Issue) => void
  onAddIssue: (taskListId: string | null) => void
  onAddChild: (parentId: string) => void
  onRenameList?: (id: string, name: string) => void
  onDeleteList?: (id: string) => void
}

function TaskListGroup({
  taskList,
  issues,
  childrenMap,
  projectId,
  statuses,
  statusLabels,
  statusColorMap,
  sprints,
  workspace,
  projectKey,
  onOpen,
  onAddIssue,
  onAddChild,
  onRenameList,
  onDeleteList,
}: TaskListGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(taskList?.name ?? "")

  const totalChildCount = issues.reduce((sum, i) => sum + (childrenMap[i.id]?.length ?? 0), 0)
  const totalCount = issues.length + totalChildCount

  const handleRenameSubmit = () => {
    if (taskList && renameValue.trim() && onRenameList) {
      onRenameList(taskList.id, renameValue.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b border-border group/header">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
        </Tooltip>

        {taskList ? (
          isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit()
                if (e.key === "Escape") { setIsRenaming(false); setRenameValue(taskList.name) }
              }}
              className="text-xs font-semibold text-foreground bg-transparent border-b border-indigo-400 outline-none px-0.5"
            />
          ) : (
            <span className="text-xs font-semibold text-foreground">{taskList.name}</span>
          )
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">No List</span>
        )}

        <span className="text-[11px] text-muted-foreground/60 font-mono">{totalCount}</span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onAddIssue(taskList?.id ?? null)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
            Add issue
          </button>

          {taskList && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">More options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer"
                  onClick={() => { setIsRenaming(true); setRenameValue(taskList.name) }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onDeleteList?.(taskList.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Issues */}
      {!collapsed && (
        <div className="divide-y divide-border/60">
          {issues.length === 0 ? (
            <div className="px-14 py-3 text-xs text-muted-foreground/50 italic">
              No issues in this list
            </div>
          ) : (
            issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                projectId={projectId}
                statuses={statuses}
                statusLabels={statusLabels}
                statusColorMap={statusColorMap}
                sprints={sprints}
                workspace={workspace}
                projectKey={projectKey}
                onOpen={onOpen}
                children={childrenMap[issue.id] ?? []}
                onAddChild={onAddChild}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── ProjectIssuesPage ────────────────────────────────────────────────────────

interface CreateDialogState {
  open: boolean
  defaultTaskListId?: string | null
  defaultParentId?: string | null
}

export function ProjectIssuesPage() {
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false })
  const [newListName, setNewListName] = useState("")
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issues, isLoading } = useIssues(projectId || undefined)
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const createTaskList = useCreateTaskList(projectId)
  const updateTaskList = useUpdateTaskList(projectId)
  const deleteTaskList = useDeleteTaskList(projectId)

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
  const allSprints = sprints ?? []

  if (!projectKey || !workspace) return null

  // ── Filter + sort all issues ─────────────────────────────────────────────
  const allFiltered = (issues ?? [])
    .filter((issue) => {
      const matchesSearch =
        !search ||
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.identifier.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter
      const matchesSprint =
        sprintFilter === "all" ||
        (sprintFilter === "none" ? !issue.sprint_id : issue.sprint_id === sprintFilter)
      return matchesSearch && matchesStatus && matchesPriority && matchesSprint
    })
    .sort((a, b) => {
      const aNum = parseInt(a.identifier.split("-")[1] ?? "0", 10)
      const bNum = parseInt(b.identifier.split("-")[1] ?? "0", 10)
      return aNum - bNum
    })

  // ── Build parent→children map from ALL issues (not just filtered) ─────────
  const childrenMap: Record<string, Issue[]> = {}
  for (const issue of issues ?? []) {
    if (issue.parent_id) {
      if (!childrenMap[issue.parent_id]) childrenMap[issue.parent_id] = []
      childrenMap[issue.parent_id].push(issue)
    }
  }

  // Top-level issues: no parent_id
  const topLevel = allFiltered.filter((i) => !i.parent_id)
  const totalCount = allFiltered.length

  // ── Group top-level issues by task_list_id ────────────────────────────────
  const knownListIds = new Set((taskLists ?? []).map((tl) => tl.id))
  const groupedByList: Record<string, Issue[]> = { __none__: [] }
  for (const tl of taskLists ?? []) {
    groupedByList[tl.id] = []
  }
  for (const issue of topLevel) {
    // If the issue's task_list_id no longer matches a known list (e.g. cache
    // is momentarily stale after a list deletion), fall back to "No List".
    const key = (issue.task_list_id && knownListIds.has(issue.task_list_id))
      ? issue.task_list_id
      : "__none__"
    groupedByList[key].push(issue)
  }

  // ── Task list CRUD handlers ───────────────────────────────────────────────
  function handleCreateList() {
    if (!newListName.trim()) return
    createTaskList.mutate(
      { name: newListName.trim() },
      {
        onSuccess: () => { setNewListName(""); setShowNewListInput(false); toast.success("List created") },
        onError: () => toast.error("Failed to create list"),
      }
    )
  }

  function handleRenameList(id: string, name: string) {
    updateTaskList.mutate({ id, name }, {
      onError: () => toast.error("Failed to rename list"),
    })
  }

  function handleDeleteList(id: string) {
    const list = taskLists?.find((tl) => tl.id === id)
    if (!confirm(`Delete list "${list?.name}"? Issues in this list will be moved to No List.`)) return
    deleteTaskList.mutate(id, {
      onSuccess: () => toast.success("List deleted"),
      onError: () => toast.error("Failed to delete list"),
    })
  }

  const GRID = "grid-cols-[70px_1fr_150px_120px_130px_140px_130px_32px]"

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Issues</h1>
          <div className="flex items-center gap-2">
            {/* New list */}
            {showNewListInput ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  placeholder="List name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateList()
                    if (e.key === "Escape") { setShowNewListInput(false); setNewListName("") }
                  }}
                  className="h-8 text-xs w-36"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCreateList} disabled={!newListName.trim() || createTaskList.isPending}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowNewListInput(false); setNewListName("") }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowNewListInput(true)}>
                <Plus className="h-4 w-4" />
                New List
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateDialog({ open: true })}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-transparent">
                <SelectValue placeholder="Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All sprints</SelectItem>
                <SelectItem value="none" className="text-xs text-muted-foreground">No sprint</SelectItem>
                {allSprints.map((s) => (
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
          <span className="text-xs font-medium text-[#6b7280]">Sprint</span>
          <span className="text-xs font-medium text-[#6b7280]">Due Date</span>
          <span className="text-xs font-medium text-[#6b7280]">Assignees</span>
          <span />
        </div>

        {/* Content */}
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
                <span />
              </div>
            ))}
          </div>
        ) : totalCount === 0 && (issues ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium mb-1">No issues yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first issue to start tracking work.
            </p>
            <Button size="sm" onClick={() => setCreateDialog({ open: true })}>
              <Plus className="h-4 w-4" />
              Create issue
            </Button>
          </div>
        ) : topLevel.length === 0 && (issues ?? []).length > 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No issues match your filters.</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="divide-y divide-border">
              {/* Task list groups */}
              {(taskLists ?? []).map((tl) => (
                <TaskListGroup
                  key={tl.id}
                  taskList={tl}
                  issues={groupedByList[tl.id] ?? []}
                  childrenMap={childrenMap}
                  projectId={projectId}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  sprints={allSprints}
                  workspace={workspace}
                  projectKey={projectKey}
                  onOpen={setSelectedIssue}
                  onAddIssue={(id) => setCreateDialog({ open: true, defaultTaskListId: id })}
                  onAddChild={(parentId) => setCreateDialog({ open: true, defaultParentId: parentId })}
                  onRenameList={handleRenameList}
                  onDeleteList={handleDeleteList}
                />
              ))}

              {/* "No List" group — always show if there are ungrouped issues or no task lists */}
              {(groupedByList["__none__"]?.length > 0 || (taskLists ?? []).length === 0) && (
                <TaskListGroup
                  taskList={null}
                  issues={groupedByList["__none__"] ?? []}
                  childrenMap={childrenMap}
                  projectId={projectId}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  sprints={allSprints}
                  workspace={workspace}
                  projectKey={projectKey}
                  onOpen={setSelectedIssue}
                  onAddIssue={(id) => setCreateDialog({ open: true, defaultTaskListId: id })}
                  onAddChild={(parentId) => setCreateDialog({ open: true, defaultParentId: parentId })}
                />
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Footer */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {totalCount} issue{totalCount !== 1 ? "s" : ""}
            </span>
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
        open={createDialog.open}
        onClose={() => setCreateDialog({ open: false })}
        projectId={projectId}
        defaultTaskListId={createDialog.defaultTaskListId}
        defaultParentId={createDialog.defaultParentId}
      />
    </div>
  )
}
