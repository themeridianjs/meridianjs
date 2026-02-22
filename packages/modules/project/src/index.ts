import { Module } from "@meridian/framework-utils"
import { ProjectModuleService } from "./service.js"
import ProjectModel from "./models/project.js"
import LabelModel from "./models/label.js"
import MilestoneModel from "./models/milestone.js"
import defaultLoader from "./loaders/default.js"

export const PROJECT_MODULE = "projectModuleService"

export default Module(PROJECT_MODULE, {
  service: ProjectModuleService,
  models: [ProjectModel, LabelModel, MilestoneModel],
  loaders: [defaultLoader],
  linkable: {
    project: { tableName: "project", primaryKey: "id" },
    label: { tableName: "label", primaryKey: "id" },
    milestone: { tableName: "milestone", primaryKey: "id" },
  },
})

export { ProjectModuleService }
