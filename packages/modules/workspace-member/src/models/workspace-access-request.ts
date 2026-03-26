import { model } from "@meridianjs/framework-utils"

const WorkspaceAccessRequest = model.define("workspace_access_request", {
  id: model.id().primaryKey(),
  workspace_id: model.text(),
  user_id: model.text(),
  message: model.text().nullable(),
  status: model.enum(["pending", "approved", "denied"]).default("pending"),
}, [
  { columns: ["workspace_id"] },
  { columns: ["workspace_id", "user_id"] },
])

export default WorkspaceAccessRequest
