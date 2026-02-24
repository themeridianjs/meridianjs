import { model } from "@meridianjs/framework-utils"

const Invitation = model.define("invitation", {
  id: model.id().primaryKey(),
  workspace_id: model.text(),
  email: model.text().nullable(),
  role: model.enum(["admin", "member"]).default("member"),
  token: model.text(),
  status: model.enum(["pending", "accepted", "revoked"]).default("pending"),
  created_by: model.text(),
})

export default Invitation
