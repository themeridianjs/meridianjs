import { model } from "@meridian/framework-utils"

const User = model.define("user", {
  id: model.id().primaryKey(),
  email: model.text(),
  password_hash: model.text(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  avatar_url: model.text().nullable(),
  is_active: model.boolean().default(true),
  last_login_at: model.date().nullable(),
  metadata: model.json().nullable(),
})

export default User
