import { Module } from "@meridianjs/framework-utils"
import { TeamMemberModuleService } from "./service.js"
import TeamMemberModel from "./models/team-member.js"
import defaultLoader from "./loaders/default.js"

export default Module("teamMemberModuleService", {
  service: TeamMemberModuleService,
  models: [TeamMemberModel],
  loaders: [defaultLoader],
})

export { TeamMemberModuleService }
