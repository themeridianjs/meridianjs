import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { useCreateIssue } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useSprints, type Sprint } from "@/api/hooks/useSprints"
import { useTaskLists } from "@/api/hooks/useTaskLists"
import { useAuth } from "@/stores/auth"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ExternalLink, Calendar as CalendarIcon, X } from "lucide-react"
import { toast } from "sonner"
import { ISSUE_STATUS_LABELS, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/constants"

function sprintDateRange(sprint: Sprint): string | null {
  if (!sprint.start_date && !sprint.end_date) return null
  const start = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "—"
  const end = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "—"
  return `${start} – ${end}`
}

interface CreateIssueDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  defaultStatus?: string
  defaultTaskListId?: string | null
  defaultParentId?: string | null
}

export function CreateIssueDialog({ open, onClose, projectId, defaultStatus = "backlog", defaultTaskListId, defaultParentId }: CreateIssueDialogProps) {
  const navigate = useNavigate()
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const { workspace: workspaceRef } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState("medium")
  const [type, setType] = useState("task")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [sprintId, setSprintId] = useState<string>("")
  const [taskListId, setTaskListId] = useState<string>(defaultTaskListId ?? "")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const createIssue = useCreateIssue()
  const { data: projectStatuses } = useProjectStatuses(projectId)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const activeSprints = (sprints ?? []).filter((s) => s.status !== "completed")

  // Build status options from project statuses; fall back to constants while loading
  const statusOptions = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setStatus(defaultStatus)
    setPriority("medium")
    setType("task")
    setAssigneeIds([])
    setSprintId("")
    setTaskListId(defaultTaskListId ?? "")
    setDueDate(undefined)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createIssue.mutate(
      { title: title.trim(), description: description.trim() || undefined, status, priority, type, project_id: projectId, workspace_id: workspaceRef!.id, assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined, sprint_id: sprintId || null, task_list_id: taskListId || null, parent_id: defaultParentId || null, due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null },
      {
        onSuccess: () => {
          toast.success("Issue created")
          handleClose()
        },
        onError: (err) => toast.error(err.message ?? "Failed to create issue"),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-desc">Description <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
            <Textarea
              id="issue-desc"
              placeholder="Add more context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusOptions).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {defaultParentId && (
            <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              Will be created as a child issue
            </div>
          )}
          {(taskLists ?? []).length > 0 && !defaultParentId && (
            <div className="space-y-1.5">
              <Label>List <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
              <Select value={taskListId || "none"} onValueChange={(v) => setTaskListId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    <span className="text-muted-foreground">No list</span>
                  </SelectItem>
                  {(taskLists ?? []).map((tl) => (
                    <SelectItem key={tl.id} value={tl.id} className="text-xs">{tl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {activeSprints.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sprint <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
              <Select value={sprintId || "none"} onValueChange={(v) => setSprintId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    <span className="text-muted-foreground">No sprint</span>
                  </SelectItem>
                  {activeSprints.map((s) => {
                    const dateRange = sprintDateRange(s)
                    return (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        <div>
                          <span>{s.name}</span>
                          {dateRange && (
                            <span className="block text-[10px] text-muted-foreground leading-tight">
                              {dateRange}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Assignees <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
            <AssigneeSelector value={assigneeIds} onChange={setAssigneeIds} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 h-9 w-full rounded-md border border-input px-3 text-sm bg-transparent hover:bg-accent transition-colors text-left"
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className={dueDate ? "text-foreground" : "text-muted-foreground"}>
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "No due date"}
                  </span>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDueDate(undefined) }}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5 justify-start sm:justify-center"
              onClick={() => {
                handleClose()
                navigate(`/${workspace}/projects/${projectKey}/issues/new`)
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open full form
            </Button>
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={!title.trim() || createIssue.isPending}>
                {createIssue.isPending ? "Creating..." : "Create issue"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
