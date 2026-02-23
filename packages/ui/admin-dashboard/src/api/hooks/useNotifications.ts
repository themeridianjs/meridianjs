import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface Notification {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  message: string
  read: boolean
  created_at: string
}

interface NotificationsResponse {
  notifications: Notification[]
  count: number
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => api.get<NotificationsResponse>("/admin/notifications"),
    select: (data) => data.notifications,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...notificationKeys.list(), "unread"],
    queryFn: () => api.get<NotificationsResponse>("/admin/notifications?read=false"),
    select: (data) => data.count,
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ ok: boolean }>(`/admin/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list() })
    },
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/admin/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list() })
    },
  })
}
