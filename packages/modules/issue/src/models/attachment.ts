import { model } from "@meridian/framework-utils"

const Attachment = model.define("attachment", {
  id: model.id().primaryKey(),
  issue_id: model.text(),
  /** UUID-based stored filename on disk */
  filename: model.text(),
  /** Original filename from the upload */
  original_name: model.text(),
  mime_type: model.text(),
  /** File size in bytes */
  size: model.number(),
  /** Publicly accessible URL, e.g. /uploads/issue-attachments/<uuid>-<name> */
  url: model.text(),
  uploader_id: model.text(),
  workspace_id: model.text(),
}, [
  { columns: ["issue_id"] },
])

export default Attachment
