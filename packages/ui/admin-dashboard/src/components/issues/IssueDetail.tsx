import { useState } from "react"
import { format } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import { useIssueComments, useCreateComment, useUpdateIssue } from "@/api/hooks/useIssues"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Send } from "lucide-react"
import { toast } from "sonner"

interface IssueDetailProps {
  issue: Issue | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function IssueDetail({ issue, projectId, open, onClose }: IssueDetailProps) {
  const [comment, setComment] = useState("")
  const { data: comments, isLoading: loadingComments } = useIssueComments(issue?.id ?? "")
  const createComment = useCreateComment(issue?.id ?? "")
  const updateIssue = useUpdateIssue(issue?.id ?? "", projectId)

  if (!issue) return null

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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col p-0 max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
            <Badge variant="muted" className="text-[10px]">
              {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
            </Badge>
          </div>
          <SheetTitle className="text-base font-medium leading-snug">
            {issue.title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Properties */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select value={issue.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs">
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
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_PRIORITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            {issue.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Comments */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Comments {comments ? `(${comments.length})` : ""}
              </p>
              <div className="space-y-4">
                {loadingComments ? (
                  <>
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </>
                ) : comments && comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                        <AvatarFallback className="text-[10px]">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">User</span>
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Comment input */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[72px] text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmitComment()
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSubmitComment}
              disabled={!comment.trim() || createComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            ⌘ + Enter to submit
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
