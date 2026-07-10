import { createDefaultLoader } from "@meridianjs/framework-utils"
import WorkspaceModel from "../models/workspace.js"

export default createDefaultLoader({
  models: [WorkspaceModel],
  ormKey: "workspaceOrm",
})
