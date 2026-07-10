import { createDefaultLoader } from "@meridianjs/framework-utils"
import UserModel from "../models/user.js"
import TeamModel from "../models/team.js"
import UserSessionModel from "../models/user-session.js"

export default createDefaultLoader({
  models: [UserModel, TeamModel, UserSessionModel],
  ormKey: "userOrm",
})
