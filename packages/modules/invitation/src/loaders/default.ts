import { createDefaultLoader } from "@meridianjs/framework-utils"
import InvitationModel from "../models/invitation.js"

export default createDefaultLoader({
  models: [InvitationModel],
  ormKey: "invitationOrm",
})
