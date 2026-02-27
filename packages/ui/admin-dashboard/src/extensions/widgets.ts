// Edit this file to register your custom widget extensions.
// Widgets are injected into predefined zones in the admin dashboard UI
// without requiring any changes to the dashboard source code.
//
// See src/lib/widget-registry.ts for the full list of available zones.

import { defineWidgets } from "./index"
import { MetadataWidget } from "./MetadataWidget"
import { SprintHealthWidget } from "@test-app/admin/widgets/SprintHealthWidget"

export default defineWidgets([
  // Issue metadata editor — appears below every issue detail page / drawer
  { zone: "issue.details.after", component: MetadataWidget },
  // Sprint progress bar — appears above the board when a sprint is active
  { zone: "project.board.before", component: SprintHealthWidget },
])
