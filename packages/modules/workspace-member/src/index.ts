import { Module } from "@meridianjs/framework-utils"
import { WorkspaceMemberModuleService } from "./service.js"
import WorkspaceMemberModel from "./models/workspace-member.js"
import WorkspaceAccessRequestModel from "./models/workspace-access-request.js"
import defaultLoader from "./loaders/default.js"

export default Module("workspaceMemberModuleService", {
  service: WorkspaceMemberModuleService,
  models: [WorkspaceMemberModel, WorkspaceAccessRequestModel],
  loaders: [defaultLoader],
})

export { WorkspaceMemberModuleService }
