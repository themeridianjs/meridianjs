import React, { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import { useOrgCalendar, useHolidays } from "@/api/hooks/useOrgSettings"
import { useAppConfig } from "@/api/hooks/useAppConfig"
import { countBusinessDays } from "@/lib/businessDays"
import { useUpdateIssue, useIssues, useIssue } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useProjectAccess } from "@/api/hooks/useProjectAccess"
import { useSprints, type Sprint } from "@/api/hooks/useSprints"
import { useTaskLists } from "@/api/hooks/useTaskLists"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { IssueActivity, type ActivityTab } from "@/components/issues/IssueActivity"
import { CommentInput } from "@/components/issues/CommentInput"
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import { RichTextEditor, RichTextContent } from "@/components/ui/rich-text-editor"
import { Pencil, X, Check, Link2, Paperclip, GitBranch, Maximize2, MoreHorizontal, ThumbsUp, Layers, FolderOpen, ListTree, Plus, ChevronUp, ChevronDown, ChevronRight, Calendar as CalendarIcon, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WidgetZone } from "@/components/WidgetZone"

function getIssueDepth(issue: Issue, allIssues: Issue[]): number {
  let depth = 0
  let current: Issue | undefined = issue
  while (current?.parent_id) {
    current = allIssues.find(i => i.id === current!.parent_id)
    depth++
  }
  return depth
}

function sprintDateRange(sprint: Sprint): string | null {
  if (!sprint.start_date && !sprint.end_date) return null
  const start = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "—"
  const end = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "—"
  return `${start} – ${end}`
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  no_priority: "bg-zinc-400",
}

function getStatusDot(category?: string, key?: string): string {
  if (category === "completed") return "bg-emerald-500"
  if (category === "in_progress") return "bg-indigo-500"
  if (category === "cancelled") return "bg-red-400"
  if (key?.includes("block")) return "bg-red-500"
  return "bg-zinc-400"
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-zinc-900 dark:text-zinc-100 mb-1.5">
    {children}
  </p>
)

const Divider = () => <div className="border-t border-zinc-100 dark:border-zinc-800" />

interface IssueDetailProps {
  issue: Issue | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function IssueDetail({ issue: issueProp, projectId, open, onClose }: IssueDetailProps) {
  const navigate = useNavigate()
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const { data: liveIssue } = useIssue(issueProp?.id ?? "")
  const issue = liveIssue ?? issueProp
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>("comments")
  const [createChildOpen, setCreateChildOpen] = useState(false)
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set())

  const updateIssue = useUpdateIssue(issue?.id ?? "", projectId)
  const { data: access } = useProjectAccess(projectId)
  const projectUsers = useMemo(
    () => access ? access.members.filter(m => m.user).map(m => m.user!) : undefined,
    [access]
  )
  const { data: projectStatuses } = useProjectStatuses(projectId)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const { data: allIssues } = useIssues(projectId || undefined)
  const { data: orgCalendar } = useOrgCalendar()
  const { data: holidays = [] } = useHolidays(new Date().getFullYear())
  const activeSprints = (sprints ?? []).filter((s) => s.status !== "completed")

  const { data: appConfig } = useAppConfig()
  const maxDepth = appConfig?.maxChildIssueDepth ?? 1
  const issueDepth = issue ? getIssueDepth(issue, allIssues ?? []) : 0
  const canAddChild = issueDepth < maxDepth

  const parentIssue = issue?.parent_id ? allIssues?.find((i) => i.id === issue.parent_id) : null
  const childIssues = allIssues?.filter((i) => i.parent_id === issue?.id) ?? []
  const currentTaskList = issue?.task_list_id ? taskLists?.find((tl) => tl.id === issue.task_list_id) : null
  const statusOptions = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  useEffect(() => {
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }, [issue?.id])

  if (!issue) return null

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return
    updateIssue.mutate(
      { title: editTitle.trim(), description: editDescription.trim() || undefined },
      {
        onSuccess: () => { setIsEditing(false); toast.success("Issue updated") },
        onError: () => toast.error("Failed to update issue"),
      }
    )
  }

  const handleCancelEdit = () => {
    setEditTitle(issue.title)
    setEditDescription(issue.description ?? "")
    setIsEditing(false)
  }

  const handleStatusChange = (status: string) => {
    updateIssue.mutate({ status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: () => toast.error("Failed to update status"),
    })
  }

  const handlePriorityChange = (priority: string) => {
    updateIssue.mutate({ priority }, {
      onSuccess: () => toast.success("Priority updated"),
      onError: () => toast.error("Failed to update priority"),
    })
  }

  const handleTypeChange = (type: string) => {
    updateIssue.mutate({ type }, {
      onSuccess: () => toast.success("Type updated"),
      onError: () => toast.error("Failed to update type"),
    })
  }

  const handleAssigneesChange = (assignee_ids: string[]) => {
    updateIssue.mutate({ assignee_ids }, {
      onSuccess: () => toast.success("Assignees updated"),
      onError: () => toast.error("Failed to update assignees"),
    })
  }

  const handleSprintChange = (sprint_id: string | null) => {
    updateIssue.mutate({ sprint_id }, {
      onSuccess: () => toast.success(sprint_id ? "Sprint assigned" : "Removed from sprint"),
      onError: () => toast.error("Failed to update sprint"),
    })
  }

  const handleTaskListChange = (task_list_id: string | null) => {
    updateIssue.mutate({ task_list_id }, {
      onSuccess: () => toast.success(task_list_id ? "Moved to list" : "Removed from list"),
      onError: () => toast.error("Failed to update list"),
    })
  }

  const handleStartDateChange = (date: Date | undefined) => {
    updateIssue.mutate(
      { start_date: date ? format(date, "yyyy-MM-dd") : null },
      {
        onSuccess: () => toast.success(date ? "Start date set" : "Start date cleared"),
        onError: () => toast.error("Failed to update start date"),
      }
    )
  }

  const handleDueDateChange = (date: Date | undefined) => {
    updateIssue.mutate(
      { due_date: date ? format(date, "yyyy-MM-dd") : null },
      {
        onSuccess: () => toast.success(date ? "Due date set" : "Due date cleared"),
        onError: () => toast.error("Failed to update due date"),
      }
    )
  }

  const handleRecurrenceToggle = (checked: boolean) => {
    if (checked) {
      const base = issue.start_date ? new Date(issue.start_date) : new Date()
      const next = new Date(base)
      next.setDate(next.getDate() + 7)
      updateIssue.mutate(
        { recurrence_frequency: "weekly", next_occurrence_date: format(next, "yyyy-MM-dd"), recurrence_end_date: null },
        {
          onSuccess: () => toast.success("Recurrence enabled"),
          onError: () => toast.error("Failed to enable recurrence"),
        }
      )
    } else {
      updateIssue.mutate(
        { recurrence_frequency: null, next_occurrence_date: null, recurrence_end_date: null },
        {
          onSuccess: () => toast.success("Recurrence stopped"),
          onError: () => toast.error("Failed to stop recurrence"),
        }
      )
    }
  }

  const handleRecurrenceFrequencyChange = (freq: "weekly" | "monthly") => {
    const base = issue.start_date ? new Date(issue.start_date) : new Date()
    const next = new Date(base)
    if (freq === "weekly") next.setDate(next.getDate() + 7)
    else next.setMonth(next.getMonth() + 1)
    updateIssue.mutate(
      { recurrence_frequency: freq, next_occurrence_date: format(next, "yyyy-MM-dd") },
      {
        onSuccess: () => toast.success("Frequency updated"),
        onError: () => toast.error("Failed to update frequency"),
      }
    )
  }

  const handleRecurrenceEndDateChange = (date: Date | undefined) => {
    updateIssue.mutate(
      { recurrence_end_date: date ? format(date, "yyyy-MM-dd") : null },
      {
        onSuccess: () => toast.success(date ? "End date set" : "End date cleared"),
        onError: () => toast.error("Failed to update end date"),
      }
    )
  }

  const completedStatus = projectStatuses?.find((s) => s.category === "completed")
  const isCompleted = !!completedStatus && issue.status === completedStatus.key

  const iconBtn = (icon: React.ElementType, label: string, onClick?: () => void) => {
    const Icon = icon
    return (
      <button
        key={label}
        title={label}
        onClick={onClick}
        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} dismissible={false}>
        <DrawerContent className="flex flex-col p-0 w-full max-w-2xl overflow-hidden bg-white dark:bg-zinc-950">

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
            <button
              onClick={() => {
                if (!completedStatus) return
                handleStatusChange(isCompleted ? (projectStatuses?.find((s) => s.category === "unstarted" || s.category === "backlog")?.key ?? issue.status) : completedStatus.key)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors",
                isCompleted
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              {isCompleted ? "Completed" : "Mark complete"}
            </button>

            <div className="flex items-center">
              {iconBtn(ThumbsUp, "Upvote")}
              {iconBtn(Paperclip, "Attachments")}
              {canAddChild && iconBtn(GitBranch, "Add sub-issue", () => setCreateChildOpen(true))}
              {iconBtn(Link2, "Copy link", () => {
                navigator.clipboard.writeText(`${window.location.origin}/${workspace}/projects/${projectKey}/issues/${issue.id}`)
                toast.success("Link copied")
              })}
              {iconBtn(Maximize2, "Open full page", () => {
                onClose()
                navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
              })}
              {isEditing ? (
                <div className="flex items-center gap-1 ml-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit} disabled={!editTitle.trim() || updateIssue.isPending}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {iconBtn(MoreHorizontal, "More options")}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {iconBtn(X, "Close", onClose)}
            </div>
          </div>

          {/* ── Title ── */}
          <div className="px-6 pt-5 pb-4 shrink-0">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm font-medium h-8"
                autoFocus
              />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                    {issue.identifier}
                  </span>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-violet-500 dark:text-violet-400">
                    {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
                  </span>
                  {issue.recurrence_frequency && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                      <RefreshCw className="h-2.5 w-2.5" />
                      Repeats {issue.recurrence_frequency === "weekly" ? "Weekly" : "Monthly"}
                    </span>
                  )}
                  {issue.recurrence_source_id && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      <RefreshCw className="h-2.5 w-2.5" />
                      Recurring instance
                    </span>
                  )}
                </div>
                <h2 className="text-[17px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                  {issue.title}
                </h2>
              </>
            )}
          </div>

          <ScrollArea className="flex-1 min-w-0">
            <div className="px-6 pb-4 space-y-5 min-w-0">
              <WidgetZone zone="issue.details.before" props={{ issue }} />

              {/* ── Status / Priority / Type ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <FieldLabel>Status</FieldLabel>
                  <Select value={issue.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 text-xs min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusOptions).map(([val, label]) => {
                        const so = projectStatuses?.find((s) => s.key === val)
                        return (
                          <SelectItem key={val} value={val} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-2 w-2 rounded-full shrink-0 flex-none", getStatusDot(so?.category, val))} />
                              <span>{label as string}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <FieldLabel>Priority</FieldLabel>
                  <Select value={issue.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-8 text-xs min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ISSUE_PRIORITY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full shrink-0 flex-none", PRIORITY_DOT[val] ?? "bg-zinc-400")} />
                            <span>{label as string}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <FieldLabel>Type</FieldLabel>
                  <Select value={issue.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="h-8 text-xs min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label as string}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Divider />

              {/* ── Assignees ── */}
              <div>
                <FieldLabel>Assignees</FieldLabel>
                <AssigneeSelector
                  value={issue.assignee_ids ?? []}
                  onChange={handleAssigneesChange}
                  disabled={updateIssue.isPending}
                  users={projectUsers}
                />
              </div>

              <Divider />

              {/* ── Sprint + List + Dates ── */}
              <div className="flex gap-3 items-start min-w-0">
                <div className="flex-1 min-w-0">
                  <FieldLabel>Sprint</FieldLabel>
                  <Select
                    value={issue.sprint_id ?? "none"}
                    onValueChange={(v) => handleSprintChange(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs min-w-0">
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="No sprint" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">
                        No sprint
                      </SelectItem>
                      {activeSprints.map((s) => {
                        const range = sprintDateRange(s)
                        return (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <div className="flex items-baseline gap-1.5">
                              <span>{s.name}</span>
                              {range && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {range}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {(taskLists ?? []).length > 0 && (
                  <div className="flex-1 min-w-0">
                    <FieldLabel>List</FieldLabel>
                    <Select
                      value={issue.task_list_id ?? "none"}
                      onValueChange={(v) => handleTaskListChange(v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-xs min-w-0">
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                          <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <SelectValue placeholder="No list">
                            {currentTaskList ? currentTaskList.name : "No list"}
                          </SelectValue>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-muted-foreground">No list</SelectItem>
                        {(taskLists ?? []).map((tl) => (
                          <SelectItem key={tl.id} value={tl.id} className="text-xs">{tl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <FieldLabel>Start Date</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 h-8 w-full min-w-0 px-2 rounded border border-input text-xs hover:bg-accent transition-colors overflow-hidden">
                        <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className={`truncate ${issue.start_date ? "text-foreground" : "text-muted-foreground"}`}>
                          {issue.start_date ? format(new Date(issue.start_date), "MMM d, yyyy") : "No date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={issue.start_date ? new Date(issue.start_date) : undefined}
                        onSelect={handleStartDateChange}
                        initialFocus
                      />
                      {issue.start_date && (
                        <div className="border-t px-3 py-2">
                          <button
                            onClick={() => handleStartDateChange(undefined)}
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
                {issue?.start_date && issue?.due_date && orgCalendar?.working_days && (() => {
                  const biz = countBusinessDays(
                    new Date(issue.start_date!),
                    new Date(issue.due_date!),
                    orgCalendar.working_days,
                    holidays
                  )
                  return (
                    <div className="shrink-0 self-end pb-1 text-[11px] text-muted-foreground whitespace-nowrap">
                      {biz} biz day{biz !== 1 ? "s" : ""}
                    </div>
                  )
                })()}
                <div className="flex-1 min-w-0">
                  <FieldLabel>Due Date</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 h-8 w-full min-w-0 px-2 rounded border border-input text-xs hover:bg-accent transition-colors overflow-hidden">
                        <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className={`truncate ${issue.due_date ? "text-foreground" : "text-muted-foreground"}`}>
                          {issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "No date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={issue.due_date ? new Date(issue.due_date) : undefined}
                        onSelect={handleDueDateChange}
                        initialFocus
                      />
                      {issue.due_date && (
                        <div className="border-t px-3 py-2">
                          <button
                            onClick={() => handleDueDateChange(undefined)}
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
              </div>

              <Divider />

              {/* ── Recurrence ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLabel>Recurring</FieldLabel>
                  <Switch
                    checked={!!issue.recurrence_frequency}
                    onCheckedChange={handleRecurrenceToggle}
                    disabled={updateIssue.isPending}
                  />
                </div>
                {issue.recurrence_frequency && (
                  <div className="space-y-2 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800">
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Frequency</p>
                      <Select
                        value={issue.recurrence_frequency}
                        onValueChange={(v) => handleRecurrenceFrequencyChange(v as "weekly" | "monthly")}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                          <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">
                        Until <span className="font-normal">(optional)</span>
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 h-7 w-full px-2 rounded border border-input text-xs hover:bg-accent transition-colors text-left">
                            <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className={issue.recurrence_end_date ? "text-foreground" : "text-muted-foreground"}>
                              {issue.recurrence_end_date ? format(new Date(issue.recurrence_end_date), "MMM d, yyyy") : "No end date"}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={issue.recurrence_end_date ? new Date(issue.recurrence_end_date) : undefined}
                            onSelect={handleRecurrenceEndDateChange}
                            initialFocus
                          />
                          {issue.recurrence_end_date && (
                            <div className="border-t px-3 py-2">
                              <button
                                onClick={() => handleRecurrenceEndDateChange(undefined)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="h-3 w-3" />
                                Clear end date
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              <Divider />

              {/* ── Child Issues ── */}
              {canAddChild && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-zinc-900 dark:text-zinc-100">
                      Child Issues
                    </span>
                    <button
                      onClick={() => setCreateChildOpen(true)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>

                  {parentIssue && (
                    <button
                      onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${parentIssue.id}`)}
                      className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left"
                    >
                      <ChevronUp className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0">Parent:</span>
                      <span className="font-mono text-[11px] font-medium text-indigo-700 dark:text-indigo-300 shrink-0">{parentIssue.identifier}</span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{parentIssue.title}</span>
                    </button>
                  )}

                  {childIssues.length === 0 ? (
                    <button
                      onClick={() => setCreateChildOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-700 dark:hover:text-indigo-400 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create child issue
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {childIssues.map((child) => {
                        const grandchildren = (allIssues ?? []).filter(i => i.parent_id === child.id)
                        const hasGrandchildren = grandchildren.length > 0
                        const isExpanded = expandedChildren.has(child.id)
                        return (
                          <div key={child.id}>
                            <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/70 hover:border-indigo-400 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-600 hover:shadow-sm transition-all group">
                              {hasGrandchildren ? (
                                <button
                                  onClick={() => setExpandedChildren(prev => {
                                    const next = new Set(prev)
                                    next.has(child.id) ? next.delete(child.id) : next.add(child.id)
                                    return next
                                  })}
                                  className="shrink-0 text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                >
                                  {isExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5" />
                                    : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                              ) : (
                                <ListTree className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
                              )}
                              <button
                                onClick={() => {
                                  onClose()
                                  navigate(`/${workspace}/projects/${projectKey}/issues/${child.id}`)
                                }}
                                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                              >
                                <span className="font-mono text-[11px] font-medium text-indigo-700 dark:text-indigo-300 shrink-0">
                                  {child.identifier}
                                </span>
                                <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                  {child.title}
                                </span>
                                {hasGrandchildren && (
                                  <span className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
                                    <ListTree className="h-2.5 w-2.5" />
                                    {grandchildren.length}
                                  </span>
                                )}
                              </button>
                            </div>

                            {hasGrandchildren && isExpanded && (
                              <div className="mt-1 ml-6 space-y-1">
                                {grandchildren.map((grand) => (
                                  <button
                                    key={grand.id}
                                    onClick={() => {
                                      onClose()
                                      navigate(`/${workspace}/projects/${projectKey}/issues/${grand.id}`)
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100/70 hover:border-indigo-400 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-600 hover:shadow-sm transition-all text-left group"
                                  >
                                    <ListTree className="h-3.5 w-3.5 text-indigo-300 dark:text-indigo-600 shrink-0" />
                                    <span className="font-mono text-[11px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                                      {grand.identifier}
                                    </span>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                      {grand.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <Divider />

              {/* ── Description ── */}
              <div>
                <FieldLabel>Description</FieldLabel>
                {isEditing ? (
                  <RichTextEditor
                    key={`${issue.id}-edit`}
                    content={editDescription}
                    onChange={setEditDescription}
                    placeholder="Add a description…"
                    className="min-h-[160px] rounded-md border border-input"
                  />
                ) : issue.description ? (
                  <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 px-3.5 py-3">
                    <RichTextContent html={issue.description} className="text-sm" />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-700 dark:hover:text-indigo-400 transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Add description
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4">
              <WidgetZone zone="issue.details.after" props={{ issue }} />
            </div>

            <IssueActivity
              issueId={issue.id}
              projectId={projectId}
              className="border-t border-border"
              compact
              hideCommentInput
              onTabChange={setActiveActivityTab}
              onViewMore={() => {
                onClose()
                navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
              }}
            />
          </ScrollArea>

          {/* ── Sticky comment input ── */}
          {activeActivityTab === "comments" && (
            <div className="border-t border-border px-6 py-3 shrink-0">
              <CommentInput issueId={issue.id} projectId={projectId} compact />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <CreateIssueDialog
        open={createChildOpen}
        onClose={() => setCreateChildOpen(false)}
        projectId={projectId}
        defaultParentId={issue.id}
        defaultTaskListId={issue.task_list_id}
      />
    </>
  )
}
