import type { MeridianContainer, ScheduledJobConfig } from "@meridian/types"

/**
 * Weekly notification digest.
 * Runs every Monday at 8:00 AM.
 *
 * Currently logs unread notification counts per user.
 * In a future phase this will send email digests via a mailer plugin.
 */
export default async function fn(container: MeridianContainer): Promise<void> {
  const logger = container.resolve("logger") as any
  const notifService = container.resolve("notificationModuleService") as any

  logger.info("[job:send-notification-digest] Generating weekly digest")

  // Fetch all unread notifications (up to 1000 for the digest batch)
  const [unread, total] = await notifService.listAndCountNotifications(
    { read: false },
    { limit: 1000 }
  )

  if (total === 0) {
    logger.info("[job:send-notification-digest] No unread notifications — skipping")
    return
  }

  // Group by user_id to get per-user unread counts
  const perUser = (unread as any[]).reduce<Record<string, number>>((acc, n) => {
    acc[n.user_id] = (acc[n.user_id] ?? 0) + 1
    return acc
  }, {})

  const userCount = Object.keys(perUser).length
  logger.info(
    `[job:send-notification-digest] ${total} unread notification(s) across ${userCount} user(s)` +
    ` — email delivery to be wired in Phase 9 (plugin system)`
  )

  // TODO (Phase 9): resolve a mailer plugin and send one email per user
}

export const config: ScheduledJobConfig = {
  name: "send-notification-digest",
  schedule: "0 8 * * 1", // every Monday at 8:00 AM
}
