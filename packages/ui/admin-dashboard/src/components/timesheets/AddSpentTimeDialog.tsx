import { useState, useMemo } from "react"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProjects } from "@/api/hooks/useProjects"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { usePaginatedIssues } from "@/api/hooks/useIssues"
import { useLogTime } from "@/api/hooks/useTimeLogs"
import { reportingKeys } from "@/api/hooks/useReporting"
import { parseDuration } from "@/lib/timesheet-utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddSpentTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date | null
}

export function AddSpentTimeDialog({ open, onOpenChange, defaultDate }: AddSpentTimeDialogProps) {
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState("")
  const [issueId, setIssueId] = useState("")
  const [duration, setDuration] = useState("")
  const [date, setDate] = useState(format(defaultDate ?? new Date(), "yyyy-MM-dd"))
  const [description, setDescription] = useState("")
  const [issueSearch, setIssueSearch] = useState("")

  // Fetch user's workspaces and pass their IDs to useProjects so the API
  // gets a workspace_ids param (required for non-privileged users)
  const { data: workspaces = [] } = useWorkspaces()
  const workspaceIds = useMemo(() => workspaces.map((w) => w.id), [workspaces])
  const { data: projects = [] } = useProjects(
    workspaceIds.length > 0 ? { workspaceIds, limit: 500 } : { allWorkspaces: true, limit: 500 },
  )

  const { data: issuesData } = usePaginatedIssues({
    project_id: projectId,
    search: issueSearch || undefined,
    pageSize: 30,
  })
  const issues = issuesData?.issues ?? []

  const logTime = useLogTime(issueId)

  const handleSubmit = () => {
    const minutes = parseDuration(duration)
    if (!minutes || minutes <= 0) {
      toast.error("Please enter a valid duration (e.g. 2h 30m)")
      return
    }
    if (!issueId) {
      toast.error("Please select an issue")
      return
    }

    logTime.mutate(
      { duration_minutes: minutes, description: description || undefined, logged_date: date },
      {
        onSuccess: () => {
          toast.success("Time logged successfully")
          queryClient.invalidateQueries({ queryKey: reportingKeys.all })
          resetAndClose()
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "Failed to log time")
        },
      },
    )
  }

  const resetAndClose = () => {
    setProjectId("")
    setIssueId("")
    setDuration("")
    setDate(format(new Date(), "yyyy-MM-dd"))
    setDescription("")
    setIssueSearch("")
    onOpenChange(false)
  }

  // When dialog opens with a new defaultDate, update the date field
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && defaultDate) {
      setDate(format(defaultDate, "yyyy-MM-dd"))
    }
    if (!nextOpen) {
      resetAndClose()
      return
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add spent time</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Project selector */}
          <div className="grid gap-1.5">
            <Label htmlFor="ts-project">Project</Label>
            <Select
              value={projectId}
              onValueChange={(val) => {
                setProjectId(val)
                setIssueId("")
                setIssueSearch("")
              }}
            >
              <SelectTrigger id="ts-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.identifier} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue selector with search */}
          <div className="grid gap-1.5">
            <Label htmlFor="ts-issue">Issue</Label>
            <Input
              placeholder="Search issues..."
              value={issueSearch}
              onChange={(e) => setIssueSearch(e.target.value)}
              className="mb-1"
              disabled={!projectId}
            />
            <Select value={issueId} onValueChange={setIssueId} disabled={!projectId}>
              <SelectTrigger id="ts-issue">
                <SelectValue placeholder={projectId ? "Select an issue" : "Select a project first"} />
              </SelectTrigger>
              <SelectContent>
                {issues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.identifier} — {issue.title}
                  </SelectItem>
                ))}
                {issues.length === 0 && projectId && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No issues found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="grid gap-1.5">
            <Label htmlFor="ts-duration">Duration</Label>
            <Input
              id="ts-duration"
              placeholder="e.g. 2h 30m"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="grid gap-1.5">
            <Label htmlFor="ts-date">Date</Label>
            <Input
              id="ts-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="ts-desc">Description (optional)</Label>
            <Textarea
              id="ts-desc"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={logTime.isPending || !issueId || !duration}>
            {logTime.isPending ? "Logging..." : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
