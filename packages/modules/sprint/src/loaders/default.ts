import { createDefaultLoader } from "@meridianjs/framework-utils"
import SprintModel from "../models/sprint.js"

export default createDefaultLoader({
  models: [SprintModel],
  ormKey: "sprintOrm",
})
