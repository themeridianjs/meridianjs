import { model } from "@meridianjs/framework-utils"

const ProjectAccessRequest = model.define("project_access_request", {
  id: model.id().primaryKey(),
  project_id: model.text(),
  user_id: model.text(),
  message: model.text().nullable(),
  status: model.enum(["pending", "approved", "denied"]).default("pending"),
}, [
  { columns: ["project_id"] },
  { columns: ["project_id", "user_id"] },
])

export default ProjectAccessRequest
