import type { MeridianContainer, ScheduledJobConfig } from "@meridian/types"

/**
 * Purges activity log records older than 90 days.
 * Runs daily at 2:00 AM to keep the activity table lean.
 */
export default async function fn(container: MeridianContainer): Promise<void> {
  const logger = container.resolve("logger") as any
  const activityService = container.resolve("activityModuleService") as any

  logger.info("[job:cleanup-old-activities] Starting activity purge (>90 days old)")

  const deleted = await activityService.purgeOldActivities(90)

  logger.info(`[job:cleanup-old-activities] Purged ${deleted} activity record(s)`)
}

export const config: ScheduledJobConfig = {
  name: "cleanup-old-activities",
  schedule: "0 2 * * *", // daily at 2:00 AM
}
