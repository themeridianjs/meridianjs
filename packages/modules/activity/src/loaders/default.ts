import { createDefaultLoader } from "@meridianjs/framework-utils"
import ActivityModel from "../models/activity.js"

export default createDefaultLoader({
  models: [ActivityModel],
  ormKey: "activityOrm",
})
