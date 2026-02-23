import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { useIssue, useIssueComments, useCreateComment, useUpdateIssue } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { useProject } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { RichTextEditor, RichTextContent } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import { ChevronLeft, Send, Pencil, X, Check } from "lucide-react"
import { toast } from "sonner"

export function IssueDetailPage() {
  const { projectId, issueId } = useParams<{ projectId: string; issueId: string }>()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [comment, setComment] = useState("")

  const { user: currentUser } = useAuth()
  const { data: userMap } = useUserMap()
  const { data: project } = useProject(projectId ?? "")
  const { data: issue, isLoading } = useIssue(issueId ?? "")
  const { data: comments, isLoading: loadingComments } = useIssueComments(issueId ?? "")
  const createComment = useCreateComment(issueId ?? "")
  const updateIssue = useUpdateIssue(issueId ?? "", projectId ?? "")

  useEffect(() => {
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }, [issue?.id])

  if (!projectId || !issueId) return null

  const getCommentAuthor = (authorId: string) => {
    if (currentUser && authorId === currentUser.id) {
      const first = currentUser.first_name ?? ""
      const last = currentUser.last_name ?? ""
      const name = `${first} ${last}`.trim() || currentUser.email
      const initials = (first[0] ?? last[0] ?? currentUser.email?.[0] ?? "U").toUpperCase()
      return { name, initials }
    }
    const mapped = userMap?.get(authorId)
    if (mapped) return mapped
    return { name: "Unknown", initials: "?" }
  }

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
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }

  const handleSubmitComment = () => {
    if (!comment.trim()) return
    createComment.mutate(comment.trim(), {
      onSuccess: () => setComment(""),
      onError: () => toast.error("Failed to add comment"),
    })
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !issue) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto">
        <Skeleton className="h-5 w-32 mb-8" />
        <div className="grid grid-cols-[1fr_280px] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-muted-foreground hover:text-foreground px-2"
          onClick={() => navigate(`/projects/${projectId}/issues`)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {project?.name ?? "Issues"}
        </Button>
        <span className="text-border">/</span>
        <span className="font-mono text-xs">{issue.identifier}</span>
        <Badge variant="muted" className="text-[10px] ml-1">
          {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
        </Badge>
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_272px] gap-8 items-start">
        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Title */}
          <div className="flex items-start gap-2 mb-5">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold h-auto py-1.5"
                autoFocus
              />
            ) : (
              <h1 className="text-xl font-semibold text-foreground leading-snug flex-1">
                {issue.title}
              </h1>
            )}
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground shrink-0 mt-0.5 gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleCancelEdit}
                >
                  <X className="h-3.5 w-3.5" />
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

          {/* Description */}
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Description
            </p>
            {isEditing ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <RichTextEditor
                  content={editDescription}
                  onChange={setEditDescription}
                  placeholder="Add a description…"
                  className="min-h-[200px]"
                />
              </div>
            ) : issue.description ? (
              <RichTextContent html={issue.description} />
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">No description</p>
            )}
          </div>

          <Separator className="mb-6" />

          {/* Activity */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Activity {comments && comments.length > 0 ? `· ${comments.length}` : ""}
            </p>

            <div className="space-y-5 mb-6">
              {loadingComments ? (
                <>
                  <div className="flex gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <Skeleton className="h-16 flex-1" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <Skeleton className="h-16 flex-1" />
                  </div>
                </>
              ) : comments && comments.length > 0 ? (
                comments.map((c) => {
                  const author = getCommentAuthor(c.author_id)
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                          {author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {author.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>

            {/* Comment input */}
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
                  className="min-h-[72px] text-sm resize-none bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment()
                    }
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
            <p className="text-[11px] text-muted-foreground mt-1.5 pl-10">
              ⌘ + Enter to submit
            </p>
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────────── */}
        <aside className="space-y-3">
          {/* Properties card */}
          <div className="bg-white dark:bg-card border border-border rounded-xl p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Properties
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select
                  value={issue.status}
                  onValueChange={(v) =>
                    updateIssue.mutate({ status: v }, { onError: () => toast.error("Failed to update") })
                  }
                >
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
                <Select
                  value={issue.priority}
                  onValueChange={(v) =>
                    updateIssue.mutate({ priority: v }, { onError: () => toast.error("Failed to update") })
                  }
                >
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_PRIORITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Type</p>
                <Select
                  value={issue.type}
                  onValueChange={(v) =>
                    updateIssue.mutate({ type: v }, { onError: () => toast.error("Failed to update") })
                  }
                >
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Assignees</p>
                <AssigneeSelector
                  value={issue.assignee_ids ?? []}
                  onChange={(assignee_ids) =>
                    updateIssue.mutate({ assignee_ids }, { onError: () => toast.error("Failed to update") })
                  }
                  disabled={updateIssue.isPending}
                />
              </div>
            </div>
          </div>

          {/* Metadata card */}
          <div className="bg-white dark:bg-card border border-border rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Details
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {format(new Date(issue.created_at), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-foreground">
                {format(new Date(issue.updated_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
