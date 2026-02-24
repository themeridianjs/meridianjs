import { model } from "@meridianjs/framework-utils"

const Activity = model.define("activity", {
  id: model.id().primaryKey(),
  /** The type of entity that was acted on, e.g. "issue", "project", "comment" */
  entity_type: model.text(),
  entity_id: model.text(),
  /** User who performed the action */
  actor_id: model.text(),
  /** Action performed, e.g. "created", "updated", "status_changed", "assigned" */
  action: model.text(),
  /** Before/after snapshot: { field: { from: x, to: y } } */
  changes: model.json().nullable(),
  workspace_id: model.text(),
})

export default Activity
