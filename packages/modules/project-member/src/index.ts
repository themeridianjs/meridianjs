import { Module } from "@meridianjs/framework-utils"
import { ProjectMemberModuleService } from "./service.js"
import ProjectMemberModel from "./models/project-member.js"
import ProjectTeamModel from "./models/project-team.js"
import defaultLoader from "./loaders/default.js"

export default Module("projectMemberModuleService", {
  service: ProjectMemberModuleService,
  models: [ProjectMemberModel, ProjectTeamModel],
  loaders: [defaultLoader],
})

export { ProjectMemberModuleService }
