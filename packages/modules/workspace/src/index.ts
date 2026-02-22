import { Module } from "@meridian/framework-utils"
import { WorkspaceModuleService } from "./service.js"
import WorkspaceModel from "./models/workspace.js"
import defaultLoader from "./loaders/default.js"

export const WORKSPACE_MODULE = "workspaceModuleService"

export default Module(WORKSPACE_MODULE, {
  service: WorkspaceModuleService,
  models: [WorkspaceModel],
  loaders: [defaultLoader],
  linkable: {
    workspace: { tableName: "workspace", primaryKey: "id" },
  },
})

export { WorkspaceModuleService }
