import { model } from "@meridian/framework-utils"

const Label = model.define("label", {
  id: model.id().primaryKey(),
  name: model.text(),
  color: model.text(),
  project_id: model.text(),
})

export default Label
