import { Module } from "@meridianjs/framework-utils"
import { AppRoleModuleService } from "./service.js"
import AppRoleModel from "./models/app-role.js"
import defaultLoader from "./loaders/default.js"

export default Module("appRoleModuleService", {
  service: AppRoleModuleService,
  models: [AppRoleModel],
  loaders: [defaultLoader],
  linkable: { appRole: { tableName: "app_role", primaryKey: "id" } },
})

export { AppRoleModuleService }
