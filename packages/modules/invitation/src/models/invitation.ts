import { model } from "@meridianjs/framework-utils"

const Invitation = model.define("invitation", {
  id: model.id().primaryKey(),
  workspace_id: model.text(),
  email: model.text().nullable(),
  role: model.enum(["super-admin", "admin", "member"]).default("member"),
  app_role_id: model.text().nullable(),
  token: model.text(),
  status: model.enum(["pending", "accepted", "revoked"]).default("pending"),
  expires_at: model.dateTime().nullable(),
  created_by: model.text(),
})

export default Invitation
