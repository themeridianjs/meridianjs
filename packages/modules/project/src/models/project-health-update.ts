import { model } from "@meridianjs/framework-utils"

const ProjectHealthUpdate = model.define("project_health_update", {
  id: model.id().primaryKey(),
  project_id: model.text(),
  health: model.enum(["on_track", "delayed", "on_hold", "completed"]),
  title: model.text().nullable(),
  summary: model.text().nullable(),
  report_date: model.text().nullable(),
  created_by: model.text().nullable(),
  collaborators: model.text().nullable(),
}, [
  { columns: ["project_id"] },
])

export default ProjectHealthUpdate
