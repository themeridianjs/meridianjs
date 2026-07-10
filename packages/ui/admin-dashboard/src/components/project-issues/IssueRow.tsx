import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useUpdateIssue, type Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { Sprint } from "@/api/hooks/useSprints"
import { useProjectAccess } from "@/api/hooks/useProjectAccess"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_COLORS,
} from "@/lib/constants"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
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
  ListTree,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// ─── PriorityIcon ─────────────────────────────────────────────────────────────

export const PriorityIcon = ({ priority, className }: { priority: string; className?: string }) => {
  const cls = cn("h-3.5 w-3.5 shrink-0", ISSUE_PRIORITY_COLORS[priority], className)
  switch (priority) {
    case "urgent": return <Zap className={cls} />
    case "high": return <ArrowUp className={cls} />
    case "medium": return <Minus className={cls} />
    case "low": return <ArrowDown className={cls} />
    default: return <Circle className={cn("h-3.5 w-3.5 shrink-0 text-zinc-300", className)} />
  }
}

export const GRID = "grid-cols-[110px_250px_150px_120px_130px_140px_130px_32px]"

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
  depth?: number
  children?: Issue[]
  childrenMap?: Record<string, Issue[]>
  onAddChild?: (parentId: string) => void
}

export function IssueRow({
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
  depth = 0,
  children = [],
  childrenMap,
  onAddChild,
}: IssueRowProps) {
  const navigate = useNavigate()
  const [openPopover, setOpenPopover] = useState<"status" | "priority" | "due" | "sprint" | null>(null)
  const [expanded, setExpanded] = useState(false)
  const update = useUpdateIssue(issue.id, projectId)
  const { data: access } = useProjectAccess(projectId)
  const projectUsers = useMemo(
    () => access ? access.members.filter(m => m.user).map(m => m.user!) : undefined,
    [access]
  )

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
          `group grid ${GRID} items-center py-3`,
          "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors",
          isChild && "bg-zinc-50/80 dark:bg-zinc-800/30",
          update.isPending && "opacity-70"
        )}
      >
        {/* ID */}
        <span
          className={cn(
            "text-xs font-mono text-muted-foreground truncate",
            "sticky left-0 z-10 transition-colors",
            isChild
              ? "bg-zinc-50/80 dark:bg-zinc-800/30 group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30"
              : "bg-white dark:bg-card group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30",
          )}
          style={{ paddingLeft: `${1.5 + depth * 1.25}rem` }}
        >
          {issue.identifier}
        </span>

        {/* Title — with expand/collapse for children */}
        <div className={cn(
          "flex items-center gap-1 min-w-0 pr-3",
          "sticky left-[110px] z-10 transition-colors",
          isChild
            ? "bg-zinc-50/80 dark:bg-zinc-800/30 group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30"
            : "bg-white dark:bg-card group-hover:bg-[#f9fafb] dark:group-hover:bg-muted/30",
        )}>
          {hasChildren ? (
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
          ) : isChild ? (
            <ListTree className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className={cn("text-sm text-foreground truncate", isChild && "text-primary")}>
            {issue.title}
          </span>
          {hasChildren && (
            <span className="shrink-0 flex items-center gap-0.5 ml-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
              <ListTree className="h-2.5 w-2.5" />
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
                <span className="text-xs text-primary truncate">
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
                <span className="text-xs text-primary">
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
            users={projectUsers}
          />
        </div>

        {/* External link + add child */}
        <div className="flex items-center gap-1 pr-6" onClick={(e) => e.stopPropagation()}>
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
      {expanded && children.map((child) => (
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
          depth={depth + 1}
          children={childrenMap?.[child.id] ?? []}
          childrenMap={childrenMap}
          onAddChild={onAddChild}
        />
      ))}
    </>
  )
}
