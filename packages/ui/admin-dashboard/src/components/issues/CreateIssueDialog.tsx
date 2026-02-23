import { useState } from "react"
import { useCreateIssue } from "@/api/hooks/useIssues"
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
import { toast } from "sonner"
import { ISSUE_STATUS_LABELS, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/constants"

interface CreateIssueDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  defaultStatus?: string
}

export function CreateIssueDialog({ open, onClose, projectId, defaultStatus = "backlog" }: CreateIssueDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState("medium")
  const [type, setType] = useState("task")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const createIssue = useCreateIssue()

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setStatus(defaultStatus)
    setPriority("medium")
    setType("task")
    setAssigneeIds([])
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createIssue.mutate(
      { title: title.trim(), description: description.trim() || undefined, status, priority, type, project_id: projectId, assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined },
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
                  {Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => (
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
          <div className="space-y-1.5">
            <Label>Assignees <span className="text-xs text-muted-foreground font-normal">Optional</span></Label>
            <AssigneeSelector value={assigneeIds} onChange={setAssigneeIds} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || createIssue.isPending}>
              {createIssue.isPending ? "Creating..." : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
