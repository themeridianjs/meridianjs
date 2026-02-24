import { model } from "@meridianjs/framework-utils"

const Team = model.define("team", {
  id: model.id().primaryKey(),
  name: model.text(),
  workspace_id: model.text(),
  description: model.text().nullable(),
  icon: model.text().nullable(),
})

export default Team
