import { model } from "@meridianjs/framework-utils"

const Comment = model.define("comment", {
  id: model.id().primaryKey(),
  body: model.text(),
  issue_id: model.text(),
  author_id: model.text(),
  edited_at: model.date().nullable(),
  /** Arbitrary key/value storage for custom integrations */
  metadata: model.json().nullable(),
})

export default Comment
