import { defineLink } from "@meridian/framework-utils"
import ProjectModule from "@meridian/project"
import IssueModule from "@meridian/issue"

export default defineLink(
  ProjectModule.linkable!.project,
  { linkable: IssueModule.linkable!.issue, isList: true }
)
