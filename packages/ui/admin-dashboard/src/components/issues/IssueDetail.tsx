import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Issue } from "@/api/hooks/useIssues"
import { useUpdateIssue, useCreateComment } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useAuth } from "@/stores/auth"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { IssueActivity } from "@/components/issues/IssueActivity"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RichTextContent } from "@/components/ui/rich-text-editor"
import { Pencil, X, Check, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"

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
  const [comment, setComment] = useState("")
  const [activeActivityTab, setActiveActivityTab] = useState<"comments" | "activity">("comments")

  const { user: currentUser } = useAuth()
  const updateIssue = useUpdateIssue(issue?.id ?? "", projectId)
  const createComment = useCreateComment(issue?.id ?? "")
  const { data: projectStatuses } = useProjectStatuses(projectId)

  const statusOptions = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  const handleSubmitComment = () => {
    if (!comment.trim()) return
    createComment.mutate(comment.trim(), {
      onSuccess: () => {
        setComment("")
        toast.success("Comment added")
      },
      onError: () => toast.error("Failed to add comment"),
    })
  }

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

  return (
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
              {/* Edit / Save / Cancel toggle */}
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
            {/* Properties grid */}
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

            {/* Assignees */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assignees</p>
              <AssigneeSelector
                value={issue.assignee_ids ?? []}
                onChange={handleAssigneesChange}
                disabled={updateIssue.isPending}
              />
            </div>

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
            <div className="flex gap-3 items-end">
              <Avatar className="h-7 w-7 shrink-0 mb-1">
                <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                  {currentUser
                    ? `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase()
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2 items-end">
                <Textarea
                  placeholder="Leave a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[68px] text-sm resize-none bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment()
                  }}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || createComment.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-1.5 pl-10">
              Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⌘ Enter</kbd> to submit
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
