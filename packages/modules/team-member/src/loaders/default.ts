import { createDefaultLoader } from "@meridianjs/framework-utils"
import TeamMemberModel from "../models/team-member.js"

export default createDefaultLoader({
  models: [TeamMemberModel],
  ormKey: "teamMemberOrm",
})
