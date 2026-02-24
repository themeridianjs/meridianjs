import { model } from "@meridianjs/framework-utils"

const ProjectMember = model.define("project_member", {
  id: model.id().primaryKey(),
  project_id: model.text(),
  user_id: model.text(),
  role: model.enum(["manager", "member", "viewer"]).default("member"),
}, [
  { columns: ["project_id"] },
  { columns: ["project_id", "user_id"], unique: true },
])

export default ProjectMember
