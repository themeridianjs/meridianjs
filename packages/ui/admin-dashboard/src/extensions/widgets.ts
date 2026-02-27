import { defineWidgets } from "./index"
import { MetadataWidget } from "./MetadataWidget"

export default defineWidgets([
  { zone: "issue.details.after", component: MetadataWidget },
])
