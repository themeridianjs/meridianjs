import { useState } from "react"
import { format } from "date-fns"
import { useIssueComments, useIssueActivities } from "@/api/hooks/useIssues"
import type { Activity } from "@/api/hooks/useIssues"
import { useAttachments } from "@/api/hooks/useAttachments"
import { useUserMap } from "@/api/hooks/useUsers"
import { useAuth } from "@/stores/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import {
  Plus, Pencil, UserPlus, UserMinus, ArrowRight, MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { IssueAttachments } from "@/components/issues/IssueAttachments"
import { IssueTimeLog } from "@/components/issues/IssueTimeLog"
import { CommentInput } from "@/components/issues/CommentInput"
import { InlineAttachment } from "@/components/issues/AttachmentViewer"
import { RichTextContent } from "@/components/ui/rich-text-editor"

// Deterministic avatar color from name
const AVATAR_PALETTE = [
  { bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/50", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/50", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-sky-100 dark:bg-sky-900/50", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/50", text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300" },
]

export function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// Render HTML from the WYSIWYG editor, or fall back to plain text for older
// comments that were saved before the editor was introduced.
function CommentBody({ body }: { body: string }) {
  const trimmed = body.trim()
  if (!trimmed) return null
  const isHtml = /^<[a-z][\s\S]*>/i.test(trimmed)
  if (isHtml) return <RichTextContent html={trimmed} className="text-xs" />
  return <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{trimmed}</p>
}

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

    if (added.length > 0 && removed.length > 0) return <>updated assignees</>
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
        parts.push(<span key={field}>updated <strong className="font-medium text-foreground">{field}</strong></span>)
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
        parts.push(<span key={field}>updated <strong className="font-medium text-foreground">{field.replace(/_/g, " ")}</strong></span>)
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
  compact?: boolean
  onViewMore?: () => void
  onTabChange?: (tab: ActivityTab) => void
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
  const [activeTab, setActiveTab] = useState<ActivityTab>("comments")

  const handleTabChange = (tab: ActivityTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const { user: currentUser } = useAuth()
  const { data: userMap } = useUserMap()
  const { data: comments, isLoading: loadingComments } = useIssueComments(issueId)
  const { data: activities, isLoading: loadingActivities } = useIssueActivities(issueId)
  const { data: allAttachments } = useAttachments(issueId)

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

  return (
    <div className={className}>
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0 px-6 pt-3 border-b border-zinc-100 dark:border-zinc-800">
        {(["comments", "activity", "attachments", "time"] as const).map((tab) => {
          const count =
            tab === "comments" ? (comments?.length ?? 0) :
            tab === "activity" ? (activities?.length ?? 0) :
            undefined
          const label =
            tab === "comments" ? "Comments" :
            tab === "activity" ? "Activity" :
            tab === "attachments" ? "Attachments" : "Time"
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "pb-2.5 mr-5 text-xs font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "text-indigo-700 dark:text-indigo-300 border-indigo-500 dark:border-indigo-400"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {label}
              {count != null && count > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] tabular-nums font-normal",
                  isActive ? "text-indigo-700 dark:text-indigo-500" : "text-zinc-400"
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Comments tab ── */}
      {activeTab === "comments" && (
        <div className="px-6 pb-5 pt-4">
          <div className="space-y-5 mb-5">
            {loadingComments ? (
              <div className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ) : comments && comments.length > 0 ? (
              (compact ? comments.slice(-5) : comments).map((c) => {
                const author = getCommentAuthor(c.author_id)
                const avatarColor = getAvatarColor(author.name)
                const commentAttachments = (allAttachments ?? []).filter(
                  (a) => a.comment_id === c.id
                )
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                      <AvatarFallback className={cn("text-[11px] font-semibold", avatarColor.bg, avatarColor.text)}>
                        {author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{author.name}</span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {format(new Date(c.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-3 py-2.5">
                        <CommentBody body={c.body} />
                      </div>
                      {commentAttachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {commentAttachments.map((a) => (
                            <InlineAttachment key={a.id} attachment={a} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">No comments yet</p>
              </div>
            )}
          </div>

          {compact && comments && comments.length > 5 && onViewMore && (
            <button
              onClick={onViewMore}
              className="text-xs text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100 mb-4 font-medium transition-colors"
            >
              View all {comments.length} comments →
            </button>
          )}

          {!hideCommentInput && (
            <CommentInput issueId={issueId} />
          )}
        </div>
      )}

      {/* ── Activity tab ── */}
      {activeTab === "activity" && (
        <div className="px-6 pb-6 pt-4">
          {loadingActivities ? (
            <div className="space-y-4">
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
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-100 dark:bg-zinc-800" />
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
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{actorName}</span>
                            {" "}
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {renderActivityDescription(act, userMap)}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
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
                  className="text-xs text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100 mt-3 font-medium transition-colors"
                >
                  View all {activities.length} events →
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4">No activity yet.</p>
          )}
        </div>
      )}

      {/* ── Attachments tab ── */}
      {activeTab === "attachments" && (
        <IssueAttachments issueId={issueId} />
      )}

      {/* ── Time tab ── */}
      {activeTab === "time" && (
        <IssueTimeLog issueId={issueId} />
      )}
    </div>
  )
}
