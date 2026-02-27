import { model } from "@meridianjs/framework-utils"

const Project = model.define("project", {
  id: model.id().primaryKey(),
  name: model.text(),
  /** Short uppercase code used as issue identifier prefix, e.g. "PROJ" */
  identifier: model.text(),
  description: model.text().nullable(),
  status: model.enum(["active", "archived", "paused"]).default("active"),
  visibility: model.enum(["private", "public", "workspace"]).default("private"),
  icon: model.text().nullable(),
  color: model.text().nullable(),
  /** Denormalized workspace reference — no FK constraint */
  workspace_id: model.text(),
  owner_id: model.text().nullable(),
  /** Arbitrary key/value storage for custom integrations */
  metadata: model.json().nullable(),
}, [
  { columns: ["workspace_id"] },
  { columns: ["identifier"], unique: true },
])

export default Project
