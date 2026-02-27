import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import { useUpdateIssue, useIssues, useIssue } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
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
import { Badge } from "@/components/ui/badge"
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
import { Pencil, X, Check, Link2, Paperclip, GitBranch, Maximize2, MoreHorizontal, PanelRight, ThumbsUp, Layers, FolderOpen, CornerDownRight, Plus, ChevronUp, Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WidgetZone } from "@/components/WidgetZone"

function sprintDateRange(sprint: Sprint): string | null {
  if (!sprint.start_date && !sprint.end_date) return null
  const start = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "—"
  const end = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "—"
  return `${start} – ${end}`
}

interface IssueDetailProps {
  issue: Issue | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function IssueDetail({ issue: issueProp, projectId, open, onClose }: IssueDetailProps) {
  const navigate = useNavigate()
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  // Subscribe to the detail query so date/field changes reflect immediately after mutation
  const { data: liveIssue } = useIssue(issueProp?.id ?? "")
  const issue = liveIssue ?? issueProp
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>("comments")

  const [createChildOpen, setCreateChildOpen] = useState(false)
  const updateIssue = useUpdateIssue(issue?.id ?? "", projectId)
  const { data: projectStatuses } = useProjectStatuses(projectId)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const { data: allIssues } = useIssues(projectId || undefined)
  const activeSprints = (sprints ?? []).filter((s) => s.status !== "completed")

  const parentIssue = issue?.parent_id ? allIssues?.find((i) => i.id === issue.parent_id) : null
  const childIssues = allIssues?.filter((i) => i.parent_id === issue?.id) ?? []
  const currentTaskList = issue?.task_list_id ? taskLists?.find((tl) => tl.id === issue.task_list_id) : null

  const statusOptions = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  // Reset edit state when issue changes
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
        onSuccess: () => {
          setIsEditing(false)
          toast.success("Issue updated")
        },
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

  return (
    <>
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="flex flex-col p-0 w-full max-w-2xl overflow-hidden">
        {/* ── Toolbar ── */}
        {(() => {
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
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              {/* Left: Mark complete */}
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

              {/* Right: action icons */}
              <div className="flex items-center">
                {iconBtn(ThumbsUp, "Upvote")}
                {iconBtn(Paperclip, "Attachments")}
                {iconBtn(GitBranch, "Add sub-issue", () => setCreateChildOpen(true))}
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
                {iconBtn(PanelRight, "Open in full page", () => {
                  onClose()
                  navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Title ── */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm font-medium h-8"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground shrink-0">{issue.identifier}</span>
              <Badge variant="muted" className="text-[10px] shrink-0">
                {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
              </Badge>
            </div>
          )}
          {!isEditing && (
            <h2 className="text-base font-medium leading-snug">{issue.title}</h2>
          )}
        </div>

        <ScrollArea className="flex-1 min-w-0">
          <div className="px-6 py-4 space-y-5 min-w-0">
            <WidgetZone zone="issue.details.before" props={{ issue }} />
            {/* Status / Priority / Type */}
            <div className="grid grid-cols-3 gap-3 mb-1">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select value={issue.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusOptions).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
                <Select value={issue.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_PRIORITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Type</p>
                <Select value={issue.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Assignees</p>
              <AssigneeSelector
                value={issue.assignee_ids ?? []}
                onChange={handleAssigneesChange}
                disabled={updateIssue.isPending}
              />
            </div>

            {/* Sprint + List + Due Date — inline row */}
            <div className="flex gap-3 items-start min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Sprint</p>
                <Select
                  value={issue.sprint_id ?? "none"}
                  onValueChange={(v) => handleSprintChange(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-xs bg-transparent min-w-0">
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
                  <p className="text-xs text-muted-foreground mb-1.5">List</p>
                  <Select
                    value={issue.task_list_id ?? "none"}
                    onValueChange={(v) => handleTaskListChange(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-transparent min-w-0">
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
                <p className="text-xs text-muted-foreground mb-1.5">Start Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 h-8 w-full min-w-0 px-2 rounded border border-input text-xs bg-transparent hover:bg-accent transition-colors overflow-hidden">
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
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Due Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 h-8 w-full min-w-0 px-2 rounded border border-input text-xs bg-transparent hover:bg-accent transition-colors overflow-hidden">
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

            {/* Child Issues — only on top-level issues */}
            {!issue.parent_id && <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Child Issues</p>
                <button
                  onClick={() => setCreateChildOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              {parentIssue && (
                <div className="flex items-center gap-2 text-xs">
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Parent:</span>
                  <button
                    onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${parentIssue.id}`)}
                    className="font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {parentIssue.identifier}
                  </button>
                  <span className="text-foreground truncate">{parentIssue.title}</span>
                </div>
              )}
              {childIssues.length === 0 && !parentIssue ? (
                <p className="text-xs text-muted-foreground/40 italic">No child issues yet</p>
              ) : (
                <div className="space-y-1">
                  {childIssues.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-xs">
                      <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => {
                          onClose()
                          navigate(`/${workspace}/projects/${projectKey}/issues/${child.id}`)
                        }}
                        className="font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {child.identifier}
                      </button>
                      <button
                        onClick={() => { onClose(); navigate(`/${workspace}/projects/${projectKey}/issues/${child.id}`) }}
                        className="text-muted-foreground truncate hover:text-foreground transition-colors text-left"
                      >
                        {child.title}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>}

            {/* Description */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Description</p>
              {isEditing ? (
                <RichTextEditor
                  key={`${issue.id}-edit`}
                  content={editDescription}
                  onChange={setEditDescription}
                  placeholder="Add a description…"
                  className="min-h-[160px] rounded-md border border-input"
                />
              ) : issue.description ? (
                <RichTextContent html={issue.description} className="text-sm" />
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description</p>
              )}
            </div>

          </div>

          <div className="px-6 py-4">
            <WidgetZone zone="issue.details.after" props={{ issue }} />
          </div>

          <IssueActivity
            issueId={issue.id}
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

        {/* Sticky comment input — only visible on Comments tab */}
        {activeActivityTab === "comments" && (
          <div className="border-t border-border px-6 py-3 shrink-0">
            <CommentInput issueId={issue.id} compact />
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
