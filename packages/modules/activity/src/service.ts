import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
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
   * Query activity records across entities for reporting (per-actor and
   * per-period views). Ordered created_at DESC. Records older than the
   * cleanup-old-activities retention window have been purged, so results
   * only cover that window.
   */
  async listActivities(filters: {
    actor_id?: string
    workspace_id?: string | string[]
    entity_type?: string
    action?: string | string[]
    /** Inclusive lower bound on created_at. */
    from?: Date
    /** Exclusive upper bound on created_at. */
    to?: Date
    /** Default 500, capped at 2000. */
    limit?: number
  }): Promise<any[]> {
    const repo = this.container.resolve<any>("activityRepository")
    const where: Record<string, unknown> = {}

    if (filters.actor_id) where.actor_id = filters.actor_id
    if (filters.entity_type) where.entity_type = filters.entity_type
    if (filters.workspace_id) {
      where.workspace_id = Array.isArray(filters.workspace_id)
        ? { $in: filters.workspace_id }
        : filters.workspace_id
    }
    if (filters.action) {
      where.action = Array.isArray(filters.action) ? { $in: filters.action } : filters.action
    }
    if (filters.from || filters.to) {
      const range: Record<string, unknown> = {}
      if (filters.from) range.$gte = filters.from
      if (filters.to) range.$lt = filters.to
      where.created_at = range
    }

    const limit = Math.min(filters.limit ?? 500, 2000)
    return repo.find(where, { orderBy: { created_at: "DESC" }, limit })
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
