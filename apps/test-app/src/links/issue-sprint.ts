import { defineLink } from "@meridian/framework-utils"
import SprintModule from "@meridian/sprint"
import IssueModule from "@meridian/issue"

export default defineLink(
  SprintModule.linkable!.sprint,
  { linkable: IssueModule.linkable!.issue, isList: true }
)
