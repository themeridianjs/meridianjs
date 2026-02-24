import { Module } from "@meridianjs/framework-utils"
import { InvitationModuleService } from "./service.js"
import InvitationModel from "./models/invitation.js"
import defaultLoader from "./loaders/default.js"

export default Module("invitationModuleService", {
  service: InvitationModuleService,
  models: [InvitationModel],
  loaders: [defaultLoader],
})

export { InvitationModuleService }
