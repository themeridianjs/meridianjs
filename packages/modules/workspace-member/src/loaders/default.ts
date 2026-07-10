import { createDefaultLoader } from "@meridianjs/framework-utils"
import WorkspaceMemberModel from "../models/workspace-member.js"
import WorkspaceAccessRequestModel from "../models/workspace-access-request.js"

export default createDefaultLoader({
  models: [WorkspaceMemberModel, WorkspaceAccessRequestModel],
  ormKey: "workspaceMemberOrm",
})
