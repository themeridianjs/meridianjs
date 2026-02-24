import { Module } from "@meridianjs/framework-utils"
import { SprintModuleService } from "./service.js"
import SprintModel from "./models/sprint.js"
import defaultLoader from "./loaders/default.js"

export const SPRINT_MODULE = "sprintModuleService"

export default Module(SPRINT_MODULE, {
  service: SprintModuleService,
  models: [SprintModel],
  loaders: [defaultLoader],
  linkable: {
    sprint: { tableName: "sprint", primaryKey: "id" },
  },
})

export { SprintModuleService }
