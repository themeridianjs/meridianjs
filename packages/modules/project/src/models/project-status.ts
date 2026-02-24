import { model } from "@meridianjs/framework-utils"

const ProjectStatus = model.define("project_status", {
  id: model.id().primaryKey(),
  /** Denormalized project reference — no FK constraint */
  project_id: model.text(),
  /** Display label, e.g. "In Progress" */
  name: model.text(),
  /** URL-safe slug stored on Issue.status, e.g. "in_progress" */
  key: model.text(),
  /** Hex color, e.g. "#6366f1" */
  color: model.text(),
  /** Semantic category used for board icon and grouping */
  category: model.enum(["backlog", "unstarted", "started", "completed", "cancelled"]),
  /** Zero-indexed column order */
  position: model.number(),
}, [
  { columns: ["project_id"] },
])

export default ProjectStatus
