import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useCreateIssue } from "@/api/hooks/useIssues"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ISSUE_STATUS_LABELS, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/constants"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"

export function IssueNewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("backlog")
  const [priority, setPriority] = useState("medium")
  const [type, setType] = useState("task")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  const createIssue = useCreateIssue()

  if (!projectId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createIssue.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        type,
        project_id: projectId,
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
      },
      {
        onSuccess: (data) => {
          toast.success("Issue created")
          // Navigate to the new issue's detail page
          navigate(`/projects/${projectId}/issues/${data.issue.id}`, { replace: true })
        },
        onError: (err) => toast.error((err as Error).message ?? "Failed to create issue"),
      }
    )
  }

  return (
    <div className="p-6 max-w-[760px] mx-auto">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-muted-foreground hover:text-foreground px-2 mb-6"
        onClick={() => navigate(`/projects/${projectId}/issues`)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to issues
      </Button>

      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-base font-semibold">New issue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new issue in this project.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base h-10"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-xs text-muted-foreground font-normal">Optional</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Add more context, steps to reproduce, acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-y text-sm"
              />
            </div>

            <Separator />

            {/* Status / Priority / Type */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-sm">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-sm">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-sm">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-1.5">
              <Label>
                Assignees{" "}
                <span className="text-xs text-muted-foreground font-normal">Optional</span>
              </Label>
              <div className="pt-0.5">
                <AssigneeSelector value={assigneeIds} onChange={setAssigneeIds} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/projects/${projectId}/issues`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createIssue.isPending}>
              {createIssue.isPending ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
