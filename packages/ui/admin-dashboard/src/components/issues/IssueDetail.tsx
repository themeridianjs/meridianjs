import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import { useUpdateIssue, useIssues } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useSprints, type Sprint } from "@/api/hooks/useSprints"
import { useTaskLists } from "@/api/hooks/useTaskLists"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { IssueActivity, type ActivityTab } from "@/components/issues/IssueActivity"
import { CommentInput } from "@/components/issues/CommentInput"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import { RichTextContent } from "@/components/ui/rich-text-editor"
import { Pencil, X, Check, ExternalLink, Layers, FolderOpen, CornerDownRight, Plus, ChevronUp } from "lucide-react"
import { toast } from "sonner"

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

export function IssueDetail({ issue, projectId, open, onClose }: IssueDetailProps) {
  const navigate = useNavigate()
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
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

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col p-0 w-full max-w-2xl">
        <SheetHeader className="pr-10">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
              <Badge variant="muted" className="text-[10px]">
                {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => {
                  onClose()
                  navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim() || updateIssue.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm font-medium h-8"
              autoFocus
            />
          ) : (
            <SheetTitle className="text-base font-medium leading-snug text-left">
              {issue.title}
            </SheetTitle>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            {/* Status / Priority / Type */}
            <div className="grid grid-cols-3 gap-3 mb-1">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select value={issue.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusOptions).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
                <Select value={issue.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_PRIORITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Type</p>
                <Select value={issue.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent">
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

            {/* Assignees + Sprint + List — inline row */}
            <div className="flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Assignees</p>
                <AssigneeSelector
                  value={issue.assignee_ids ?? []}
                  onChange={handleAssigneesChange}
                  disabled={updateIssue.isPending}
                />
              </div>
              <div className="w-[130px] shrink-0">
                <p className="text-xs text-muted-foreground mb-1.5">Sprint</p>
                <Select
                  value={issue.sprint_id ?? "none"}
                  onValueChange={(v) => handleSprintChange(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <div className="flex items-center gap-1 min-w-0">
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
                <div className="w-[130px] shrink-0">
                  <p className="text-xs text-muted-foreground mb-1.5">List</p>
                  <Select
                    value={issue.task_list_id ?? "none"}
                    onValueChange={(v) => handleTaskListChange(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-transparent">
                      <div className="flex items-center gap-1 min-w-0">
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
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="text-sm min-h-[100px] bg-transparent"
                />
              ) : issue.description ? (
                <RichTextContent html={issue.description} className="text-sm" />
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description</p>
              )}
            </div>

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
      </SheetContent>
    </Sheet>

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
