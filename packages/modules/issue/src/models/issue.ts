import { model } from "@meridianjs/framework-utils"

const Issue = model.define("issue", {
  id: model.id().primaryKey(),
  /** Full identifier, e.g. "PROJ-42" */
  identifier: model.text(),
  /** Sequential number within the project, e.g. 42 */
  number: model.number(),
  title: model.text(),
  description: model.text().nullable(),
  type: model.enum(["bug", "feature", "task", "epic", "story"]).default("task"),
  priority: model.enum(["urgent", "high", "medium", "low", "none"]).default("none"),
  status: model.text().default("backlog"),
  /** Denormalized — not a FK */
  project_id: model.text(),
  workspace_id: model.text(),
  /** Array of user IDs assigned to this issue */
  assignee_ids: model.json().nullable(),
  reporter_id: model.text().nullable(),
  /** Parent issue ID for subtasks */
  parent_id: model.text().nullable(),
  /** Denormalized sprint reference — no FK constraint */
  sprint_id: model.text().nullable(),
  /** Denormalized task list reference — no FK constraint */
  task_list_id: model.text().nullable(),
  start_date: model.date().nullable(),
  due_date: model.date().nullable(),
  /** Story point estimate */
  estimate: model.number().nullable(),
  /** Arbitrary key/value storage for custom integrations */
  metadata: model.json().nullable(),
}, [
  { columns: ["project_id"] },
  { columns: ["workspace_id"] },
  { columns: ["project_id", "status"] },
])

export default Issue
