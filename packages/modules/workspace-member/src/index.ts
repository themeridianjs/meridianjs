import { Module } from "@meridianjs/framework-utils"
import { WorkspaceMemberModuleService } from "./service.js"
import WorkspaceMemberModel from "./models/workspace-member.js"
import defaultLoader from "./loaders/default.js"

export default Module("workspaceMemberModuleService", {
  service: WorkspaceMemberModuleService,
  models: [WorkspaceMemberModel],
  loaders: [defaultLoader],
})

export { WorkspaceMemberModuleService }
