import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import ActivityModel from "./models/activity.js"

export interface RecordActivityInput {
  entity_type: string
  entity_id: string
  actor_id: string
  action: string
  workspace_id: string
  changes?: Record<string, { from: unknown; to: unknown }>
}

export class ActivityModuleService extends MeridianService({ Activity: ActivityModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Record an audit log entry. Fire-and-forget safe — never throws. */
  async recordActivity(input: RecordActivityInput): Promise<any> {
    const repo = this.container.resolve<any>("activityRepository")
    const activity = repo.create({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action: input.action,
      workspace_id: input.workspace_id,
      changes: input.changes ?? null,
    })
    await repo.persistAndFlush(activity)
    return activity
  }

  /** List activity log for a specific entity. */
  async listActivityForEntity(entityType: string, entityId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("activityRepository")
    return repo.find({ entity_type: entityType, entity_id: entityId })
  }

  /**
   * Hard-delete activity records older than `daysOld` days.
   * Called by the cleanup-old-activities scheduled job.
   * Returns the number of records deleted.
   */
  async purgeOldActivities(daysOld: number): Promise<number> {
    const repo = this.container.resolve<any>("activityRepository")
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)

    // MikroORM supports query operators like $lt directly in filters
    const old = await repo.find({ created_at: { $lt: cutoff } })
    if (old.length === 0) return 0

    for (const record of old) {
      await repo.removeAndFlush(record)
    }
    return old.length
  }
}
