import { useState } from "react"
import { format } from "date-fns"
import { useIssueComments, useIssueActivities, useCreateComment } from "@/api/hooks/useIssues"
import type { Activity } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { useAuth } from "@/stores/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import {
  Plus, Pencil, UserPlus, UserMinus, ArrowRight, Send,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { IssueAttachments } from "@/components/issues/IssueAttachments"
import { IssueTimeLog } from "@/components/issues/IssueTimeLog"

// ── Activity helpers ───────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  created:        { icon: Plus,      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  status_changed: { icon: ArrowRight, color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  assigned:       { icon: UserPlus,  color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/40" },
  unassigned:     { icon: UserMinus, color: "text-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-800" },
  updated:        { icon: Pencil,    color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/40" },
}

function renderActivityDescription(
  activity: Activity,
  userMap: Map<string, { name: string; initials: string }> | undefined
): React.ReactNode {
  const { action, changes } = activity

  if (action === "created") return "created this issue"

  if (action === "status_changed") {
    const from = changes?.status?.from as string | undefined
    const to   = changes?.status?.to   as string | undefined
    return (
      <>
        changed status
        {from && <> from <strong className="font-medium text-foreground">{ISSUE_STATUS_LABELS[from] ?? from}</strong></>}
        {to   && <> to <strong className="font-medium text-foreground">{ISSUE_STATUS_LABELS[to] ?? to}</strong></>}
      </>
    )
  }

  if (action === "assigned" || action === "unassigned") {
    const toIds   = (changes?.assignee_ids?.to   as string[]) ?? []
    const fromIds = (changes?.assignee_ids?.from as string[]) ?? []
    const added   = toIds.filter(id => !fromIds.includes(id))
    const removed = fromIds.filter(id => !toIds.includes(id))
    const resolve = (id: string) => userMap?.get(id)?.name ?? id.slice(0, 8) + "…"

    if (added.length > 0 && removed.length > 0)
      return <>updated assignees</>
    if (added.length > 0)
      return <>assigned <strong className="font-medium text-foreground">{added.map(resolve).join(", ")}</strong></>
    if (removed.length > 0)
      return <>unassigned <strong className="font-medium text-foreground">{removed.map(resolve).join(", ")}</strong></>
    return "updated assignees"
  }

  if (action === "updated" && changes) {
    const parts: React.ReactNode[] = []
    for (const [field, change] of Object.entries(changes)) {
      const { from, to } = change as { from: unknown; to: unknown }
      if (field === "title" || field === "description") {
        parts.push(
          <span key={field}>updated <strong className="font-medium text-foreground">{field}</strong></span>
        )
      } else if (field === "priority") {
        parts.push(
          <span key={field}>
            changed <strong className="font-medium text-foreground">priority</strong>
            {from != null && <> from <strong className="font-medium text-foreground">{ISSUE_PRIORITY_LABELS[from as string] ?? String(from)}</strong></>}
            {to   != null && <> to <strong className="font-medium text-foreground">{ISSUE_PRIORITY_LABELS[to as string] ?? String(to)}</strong></>}
          </span>
        )
      } else if (field === "type") {
        parts.push(
          <span key={field}>
            changed <strong className="font-medium text-foreground">type</strong>
            {from != null && <> from <strong className="font-medium text-foreground">{ISSUE_TYPE_LABELS[from as string] ?? String(from)}</strong></>}
            {to   != null && <> to <strong className="font-medium text-foreground">{ISSUE_TYPE_LABELS[to as string] ?? String(to)}</strong></>}
          </span>
        )
      } else {
        parts.push(
          <span key={field}>updated <strong className="font-medium text-foreground">{field.replace(/_/g, " ")}</strong></span>
        )
      }
    }
    if (parts.length === 0) return "made changes"
    return (
      <>
        {parts.reduce<React.ReactNode[]>((acc, el, i) =>
          i === 0 ? [el] : [...acc, <span key={`sep-${i}`}> and </span>, el], []
        )}
      </>
    )
  }

  return action.replace(/_/g, " ")
}

// ── Component ──────────────────────────────────────────────────────────────────

export type ActivityTab = "comments" | "activity" | "attachments" | "time"

interface IssueActivityProps {
  issueId: string
  className?: string
  /** Show only the latest N items with a "View all" button */
  compact?: boolean
  /** Called when the user clicks "View all" */
  onViewMore?: () => void
  /** Called whenever the active tab changes */
  onTabChange?: (tab: ActivityTab) => void
  /** Hide the built-in comment input (e.g. when parent renders a sticky one) */
  hideCommentInput?: boolean
}

export function IssueActivity({
  issueId,
  className,
  compact,
  onViewMore,
  onTabChange,
  hideCommentInput,
}: IssueActivityProps) {
  const [comment, setComment] = useState("")
  const [activeTab, setActiveTab] = useState<ActivityTab>("comments")

  const handleTabChange = (tab: ActivityTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const { user: currentUser } = useAuth()
  const { data: userMap } = useUserMap()
  const { data: comments, isLoading: loadingComments } = useIssueComments(issueId)
  const { data: activities, isLoading: loadingActivities } = useIssueActivities(issueId)
  const createComment = useCreateComment(issueId)

  const getCommentAuthor = (authorId: string) => {
    if (currentUser && authorId === currentUser.id) {
      const first = currentUser.first_name ?? ""
      const last  = currentUser.last_name  ?? ""
      const name  = `${first} ${last}`.trim() || currentUser.email
      const initials = (first[0] ?? last[0] ?? currentUser.email?.[0] ?? "U").toUpperCase()
      return { name, initials }
    }
    return userMap?.get(authorId) ?? { name: "Unknown", initials: "?" }
  }

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

  return (
    <div className={className}>
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-6 pt-4 pb-2 flex-wrap">
        {(["comments", "activity", "attachments", "time"] as const).map((tab) => {
          const count =
            tab === "comments" ? (comments?.length ?? 0) :
            tab === "activity" ? (activities?.length ?? 0) :
            undefined
          const label =
            tab === "comments" ? "Comments" :
            tab === "activity" ? "Activity" :
            tab === "attachments" ? "Attachments" :
            "Time"
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === tab
                  ? "bg-foreground/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {label}
              {count != null && count > 0 && (
                <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Comments tab ──────────────────────────────────────────────────────── */}
      {activeTab === "comments" && (
        <div className="px-6 pb-5">
          <div className="space-y-5 mb-5">
            {loadingComments ? (
              <div className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ) : comments && comments.length > 0 ? (
              (compact ? comments.slice(-5) : comments).map((c) => {
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
                        <span className="text-xs font-medium text-foreground">{author.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(c.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {c.body}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground/50 py-2">No comments yet.</p>
            )}
          </div>

          {compact && comments && comments.length > 5 && onViewMore && (
            <button
              onClick={onViewMore}
              className="text-xs text-muted-foreground hover:text-foreground mb-4 underline underline-offset-2"
            >
              View all {comments.length} comments
            </button>
          )}

          {!hideCommentInput && (
            <>
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
            </>
          )}
        </div>
      )}

      {/* ── Activity tab ──────────────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="px-6 pb-6">
          {loadingActivities ? (
            <div className="space-y-4 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                  <Skeleton className="h-4 flex-1 mt-1" />
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <>
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-0">
                {(compact ? activities.slice(-5) : activities).map((act, idx, arr) => {
                  const cfg = ACTIVITY_ICONS[act.action] ?? ACTIVITY_ICONS.updated
                  const Icon = cfg.icon
                  const actorName = userMap?.get(act.actor_id)?.name ?? "System"
                  const isLast = idx === arr.length - 1
                  return (
                    <div key={act.id} className={cn("relative flex gap-3", isLast ? "pb-0" : "pb-4")}>
                      <div className={cn(
                        "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                        cfg.bg
                      )}>
                        <Icon className={cn("h-3 w-3", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-xs text-foreground leading-relaxed">
                          <span className="font-medium">{actorName}</span>
                          {" "}
                          <span className="text-muted-foreground">
                            {renderActivityDescription(act, userMap)}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {format(new Date(act.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {compact && activities.length > 5 && onViewMore && (
              <button
                onClick={onViewMore}
                className="text-xs text-muted-foreground hover:text-foreground mt-3 underline underline-offset-2"
              >
                View all {activities.length} events
              </button>
            )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground/50 py-2">No activity yet.</p>
          )}
        </div>
      )}
      {/* ── Attachments tab ───────────────────────────────────────────────────── */}
      {activeTab === "attachments" && (
        <IssueAttachments issueId={issueId} />
      )}

      {/* ── Time tab ──────────────────────────────────────────────────────────── */}
      {activeTab === "time" && (
        <IssueTimeLog issueId={issueId} />
      )}
    </div>
  )
}
