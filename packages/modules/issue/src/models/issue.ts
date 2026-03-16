import { model } from "@meridianjs/framework-utils"

const Issue = model.define("issue", {
  id: model.id().primaryKey(),
  /** Full identifier, e.g. "PROJ-42" */
  identifier: model.text(),
  /** Sequential number within the project, e.g. 42 */
  number: model.number(),
  title: model.text(),
  description: model.text().nullable(),
  type: model.enum(["bug", "feature", "task", "epic", "story", "improvement"]).default("task"),
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
  /** Recurrence frequency — set on the template issue */
  recurrence_frequency: model.enum(["weekly", "monthly"]).nullable(),
  /** Optional hard stop date for the recurrence */
  recurrence_end_date: model.date().nullable(),
  /** Date when the cron job should next fire for this template */
  next_occurrence_date: model.date().nullable(),
  /** Set on instance issues only — ID of the template that spawned this issue */
  recurrence_source_id: model.text().nullable(),
}, [
  { columns: ["project_id"] },
  { columns: ["workspace_id"] },
  { columns: ["project_id", "status"] },
])

export default Issue
