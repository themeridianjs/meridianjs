import { defineLink } from "@meridian/framework-utils"
import WorkspaceModule from "@meridian/workspace"
import ProjectModule from "@meridian/project"

export default defineLink(
  WorkspaceModule.linkable!.workspace,
  { linkable: ProjectModule.linkable!.project, isList: true }
)
