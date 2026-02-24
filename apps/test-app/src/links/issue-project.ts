import { defineLink } from "@meridianjs/framework-utils"
import ProjectModule from "@meridianjs/project"
import IssueModule from "@meridianjs/issue"

export default defineLink(
  ProjectModule.linkable!.project,
  { linkable: IssueModule.linkable!.issue, isList: true }
)
