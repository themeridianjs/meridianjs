import { defineLink } from "@meridianjs/framework-utils"
import WorkspaceModule from "@meridianjs/workspace"
import ProjectModule from "@meridianjs/project"

export default defineLink(
  WorkspaceModule.linkable!.workspace,
  { linkable: ProjectModule.linkable!.project, isList: true }
)
