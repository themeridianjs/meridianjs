import { useNavigate, useParams } from "react-router-dom"
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/api/hooks/useNotifications"
import { useProjects } from "@/api/hooks/useProjects"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, CheckCheck, GitBranch, Layers, MessageSquare, Zap } from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ENTITY_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string }> = {
  issue:   { icon: GitBranch,     label: "Issue" },
  project: { icon: Layers,        label: "Project" },
  comment: { icon: MessageSquare, label: "Comment" },
  sprint:  { icon: Zap,           label: "Sprint" },
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date))     return formatDistanceToNow(date, { addSuffix: true })
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`
  return format(date, "MMM d, yyyy")
}

export function NotificationsPage() {
  const { workspace } = useParams<{ workspace: string }>()
  const navigate = useNavigate()

  const { data: notifications, isLoading } = useNotifications()
  const { data: projects = [] } = useProjects()
  const markAsRead    = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  // project_id → identifier lookup from cached projects list
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]))

  function getLink(notification: NonNullable<typeof notifications>[number]): string | null {
    if (notification.entity_type === "issue" && notification.metadata?.project_id) {
      const project = projectById[notification.metadata.project_id]
      if (project) return `/${workspace}/projects/${project.identifier}/issues/${notification.entity_id}`
    }
    if (notification.entity_type === "project") {
      const project = projectById[notification.entity_id]
      if (project) return `/${workspace}/projects/${project.identifier}/board`
    }
    return null
  }

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() =>
                markAllAsRead.mutate(undefined, {
                  onSuccess: () => toast.success("All marked as read"),
                  onError:   () => toast.error("Failed"),
                })
              }
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Table column headers */}
        <div className="grid grid-cols-[20px_130px_1fr_130px_88px] items-center px-6 py-2.5 border-b border-border">
          <span />
          <span className="text-xs font-medium text-[#6b7280]">Type</span>
          <span className="text-xs font-medium text-[#6b7280]">Message</span>
          <span className="text-xs font-medium text-[#6b7280]">Time</span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-[20px_130px_1fr_130px_88px] items-center px-6 py-3">
                <div />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-20" />
                <div />
              </div>
            ))}
          </div>
        ) : !notifications?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No notifications</p>
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const cfg    = ENTITY_CONFIG[notification.entity_type] ?? { icon: Bell, label: notification.entity_type }
              const Icon   = cfg.icon
              const link   = getLink(notification)

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "grid grid-cols-[20px_130px_1fr_130px_88px] items-center px-6 py-3 transition-colors",
                    !notification.read && "bg-[#eff6ff] dark:bg-indigo-950/20",
                    "hover:bg-[#f9fafb] dark:hover:bg-muted/30",
                    link && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (link) {
                      if (!notification.read) markAsRead.mutate(notification.id)
                      navigate(link)
                    }
                  }}
                >
                  {/* Unread dot */}
                  <div className="flex items-center justify-center">
                    {!notification.read && (
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>

                  {/* Type badge */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Message */}
                  <p className={cn(
                    "text-sm truncate",
                    !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {notification.message}
                  </p>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground">
                    {formatTime(notification.created_at)}
                  </span>

                  {/* Mark read action — stopPropagation so row click doesn't also fire */}
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground px-2"
                        onClick={() =>
                          markAsRead.mutate(notification.id, {
                            onError: () => toast.error("Failed"),
                          })
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!isLoading && !!notifications?.length && (
          <div className="px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
