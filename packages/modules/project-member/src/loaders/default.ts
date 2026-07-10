import { createDefaultLoader } from "@meridianjs/framework-utils"
import ProjectMemberModel from "../models/project-member.js"
import ProjectTeamModel from "../models/project-team.js"
import ProjectAccessRequestModel from "../models/project-access-request.js"

export default createDefaultLoader({
  models: [ProjectMemberModel, ProjectTeamModel, ProjectAccessRequestModel],
  ormKey: "projectMemberOrm",
})
