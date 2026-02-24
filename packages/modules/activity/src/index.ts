import { Module } from "@meridianjs/framework-utils"
import { ActivityModuleService } from "./service.js"
import ActivityModel from "./models/activity.js"
import defaultLoader from "./loaders/default.js"

export const ACTIVITY_MODULE = "activityModuleService"

export default Module(ACTIVITY_MODULE, {
  service: ActivityModuleService,
  models: [ActivityModel],
  loaders: [defaultLoader],
  linkable: {
    activity: { tableName: "activity", primaryKey: "id" },
  },
})

export { ActivityModuleService }
export type { RecordActivityInput } from "./service.js"
