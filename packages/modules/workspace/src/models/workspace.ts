import { model } from "@meridianjs/framework-utils"

const Workspace = model.define("workspace", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  logo_url: model.text().nullable(),
  plan: model.enum(["free", "pro", "enterprise"]).default("free"),
  settings: model.json().nullable(),
})

export default Workspace
