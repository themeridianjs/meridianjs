import { defineLink } from "@meridianjs/framework-utils"
import SprintModule from "@meridianjs/sprint"
import IssueModule from "@meridianjs/issue"

export default defineLink(
  SprintModule.linkable!.sprint,
  { linkable: IssueModule.linkable!.issue, isList: true }
)
