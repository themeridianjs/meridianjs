import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/api/hooks/useNotifications"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, CheckCheck } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <div className="p-6 max-w-[800px]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              markAllAsRead.mutate(undefined, {
                onSuccess: () => toast.success("All marked as read"),
                onError: () => toast.error("Failed"),
              })
            }
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
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
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-4 px-6 py-4 transition-colors",
                  !notification.read && "bg-[#eff6ff] dark:bg-[hsl(var(--indigo-subtle))]",
                  "hover:bg-[#f9fafb] dark:hover:bg-muted/30"
                )}
              >
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0 w-4 flex justify-center">
                  {!notification.read && (
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !notification.read && "font-medium")}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {notification.entity_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(notification.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>

                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 text-xs text-muted-foreground"
                    onClick={() => markAsRead.mutate(notification.id, {
                      onError: () => toast.error("Failed"),
                    })}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications && notifications.length > 0 && (
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
