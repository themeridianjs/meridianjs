import { model } from "@meridianjs/framework-utils"

const WorkspaceMember = model.define("workspace_member", {
  id: model.id().primaryKey(),
  workspace_id: model.text(),
  user_id: model.text(),
  role: model.enum(["admin", "member"]).default("member"),
}, [
  { columns: ["workspace_id"] },
  { columns: ["workspace_id", "user_id"], unique: true },
])

export default WorkspaceMember
