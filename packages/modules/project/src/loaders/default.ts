import { createDefaultLoader } from "@meridianjs/framework-utils"
import ProjectModel from "../models/project.js"
import LabelModel from "../models/label.js"
import MilestoneModel from "../models/milestone.js"
import ProjectStatusModel from "../models/project-status.js"
import ProjectHealthUpdateModel from "../models/project-health-update.js"

export default createDefaultLoader({
  models: [ProjectModel, LabelModel, MilestoneModel, ProjectStatusModel, ProjectHealthUpdateModel],
  ormKey: "projectOrm",
})
