import { useState, useEffect } from "react"
import { format } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import { useIssueComments, useCreateComment, useUpdateIssue } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { useAuth } from "@/stores/auth"
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
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import { Send, Pencil, X, Check } from "lucide-react"
import { toast } from "sonner"

interface IssueDetailProps {
  issue: Issue | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function IssueDetail({ issue, projectId, open, onClose }: IssueDetailProps) {
  const [comment, setComment] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const { user: currentUser } = useAuth()
  const { data: userMap } = useUserMap()
  const { data: comments, isLoading: loadingComments } = useIssueComments(issue?.id ?? "")
  const createComment = useCreateComment(issue?.id ?? "")
  const updateIssue = useUpdateIssue(issue?.id ?? "", projectId)

  // Reset edit state when issue changes
  useEffect(() => {
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }, [issue?.id])

  if (!issue) return null

  const getCommentAuthor = (authorId: string) => {
    // Prefer current user if it's their own comment
    if (currentUser && authorId === currentUser.id) {
      return {
        name: `${currentUser.first_name} ${currentUser.last_name}`.trim(),
        initials: `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase(),
      }
    }
    // Look up in the users map
    const mapped = userMap?.get(authorId)
    if (mapped) return mapped
    // Fallback
    return { name: "Unknown", initials: "?" }
  }

  const handleSubmitComment = () => {
    if (!comment.trim()) return
    createComment.mutate(comment.trim(), {
      onSuccess: () => {
        setComment("")
      },
      onError: () => toast.error("Failed to add comment"),
    })
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
    setEditTitle(issue.title)
    setEditDescription(issue.description ?? "")
    setIsEditing(false)
  }

  const handleStatusChange = (status: string) => {
    updateIssue.mutate({ status }, {
      onError: () => toast.error("Failed to update status"),
    })
  }

  const handlePriorityChange = (priority: string) => {
    updateIssue.mutate({ priority }, {
      onError: () => toast.error("Failed to update priority"),
    })
  }

  const handleTypeChange = (type: string) => {
    updateIssue.mutate({ type }, {
      onError: () => toast.error("Failed to update type"),
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select value={issue.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_STATUS_LABELS).map(([val, label]) => (
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
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description</p>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Activity {comments && comments.length > 0 ? `· ${comments.length}` : ""}
              </p>
              <div className="space-y-5">
                {loadingComments ? (
                  <>
                    <div className="flex gap-3">
                      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                      <Skeleton className="h-14 flex-1" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                      <Skeleton className="h-14 flex-1" />
                    </div>
                  </>
                ) : comments && comments.length > 0 ? (
                  comments.map((c) => {
                    const author = getCommentAuthor(c.author_id)
                    return (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {author.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {author.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Comment input */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <Avatar className="h-6 w-6 shrink-0 mb-1">
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
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
          <p className="text-[11px] text-muted-foreground mt-1.5 pl-8">
            ⌘ + Enter to submit
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
