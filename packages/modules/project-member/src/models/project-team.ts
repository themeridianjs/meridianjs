import { model } from "@meridianjs/framework-utils"

const ProjectTeam = model.define("project_team", {
  id: model.id().primaryKey(),
  project_id: model.text(),
  team_id: model.text(),
}, [
  { columns: ["project_id"] },
  { columns: ["project_id", "team_id"], unique: true },
])

export default ProjectTeam
