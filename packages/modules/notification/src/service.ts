import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import Notification from "./models/notification.js"

interface CreateNotificationInput {
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  message?: string | null
  workspace_id: string
}

export class NotificationModuleService extends MeridianService({ Notification }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Create a new notification record for a user */
  async createNotification(input: CreateNotificationInput): Promise<any> {
    return this.createNotification_(input)
  }

  private async createNotification_(input: CreateNotificationInput) {
    const repo = this.container.resolve("notificationRepository") as any
    const record = repo.create({
      user_id: input.user_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      message: input.message ?? null,
      read: false,
      workspace_id: input.workspace_id,
    })
    await repo.persistAndFlush(record)
    return record
  }

  /** List notifications for a specific user, newest first */
  async listNotificationsForUser(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<[any[], number]> {
    const filters: Record<string, unknown> = { user_id: userId }
    if (options.unreadOnly) filters.read = false

    return this.listAndCountNotifications(filters, {
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      orderBy: { created_at: "DESC" },
    })
  }

  /** Mark a single notification as read */
  async markAsRead(notificationId: string): Promise<any> {
    return this.updateNotification(notificationId, { read: true })
  }

  /** Mark all notifications for a user as read */
  async markAllAsRead(userId: string): Promise<void> {
    const repo = this.container.resolve("notificationRepository") as any
    const unread = await repo.find({ user_id: userId, read: false })
    for (const n of unread) {
      n.read = true
    }
    await repo.flush()
  }
}
