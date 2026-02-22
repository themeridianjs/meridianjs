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
}
