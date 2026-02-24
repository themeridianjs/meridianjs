import { model } from "@meridianjs/framework-utils"

const TeamMember = model.define("team_member", {
  id: model.id().primaryKey(),
  team_id: model.text(),
  user_id: model.text(),
}, [
  { columns: ["team_id"] },
  { columns: ["team_id", "user_id"], unique: true },
])

export default TeamMember
