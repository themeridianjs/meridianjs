---
id: widgets
title: Dashboard Widgets
description: Widget zones, widget file format, and available props.
sidebar_position: 2
---

# Dashboard Widgets

The admin dashboard supports extension via **widget zones** — named slots in the UI where you can inject custom React components. Widgets are compiled from `src/admin/widgets/index.tsx` in your project and loaded at runtime by `meridian serve-dashboard`.

---

## How It Works

1. Create `src/admin/widgets/index.tsx` in your Meridian project.
2. Export an array of widget definitions using `defineWidgets`.
3. Run `meridian serve-dashboard` — it compiles your widgets via esbuild and serves them at `/admin-extensions.js`. The dashboard loads this file at startup and injects your components into the declared zones.

---

## Widget File Format

```typescript
// src/admin/widgets/index.tsx
import { defineWidgets } from "@meridianjs/admin-dashboard/extensions"
import { MyWidget } from "./MyWidget"

export default defineWidgets([
  { zone: "issue.details.after", component: MyWidget },
])
```

Each entry is a `{ zone, component }` object. The component receives typed props for the zone it targets — TypeScript will error if the props don't match.

---

## Available Widget Zones

| Zone | Page / Component | Props |
|---|---|---|
| `issue.details.before` | Issue Detail (inline + full-page) | `{ issue: Issue }` |
| `issue.details.after` | Issue Detail (inline + full-page) | `{ issue: Issue }` |
| `issue.details.sidebar` | Issue Detail Page (full-page only) | `{ issue: Issue }` |
| `project.board.before` | Kanban Board | `{ projectId: string }` |
| `project.board.after` | Kanban Board | `{ projectId: string }` |
| `project.issues.before` | Project Issues List | `{ projectId: string }` |
| `project.issues.after` | Project Issues List | `{ projectId: string }` |
| `project.timeline.before` | Project Timeline (Gantt) | `{ projectId: string }` |
| `project.timeline.after` | Project Timeline (Gantt) | `{ projectId: string }` |
| `project.sprints.before` | Sprints Page | `{ projectId: string }` |
| `project.sprints.after` | Sprints Page | `{ projectId: string }` |
| `workspace.settings.before` | Workspace Settings | `{ workspaceId: string }` |
| `workspace.settings.after` | Workspace Settings | `{ workspaceId: string }` |

---

## Example: Custom Metadata Widget

The built-in `MetadataWidget` (shipped as a reference example in the dashboard source) demonstrates the pattern. It renders in `issue.details.after` and lets users manage key/value metadata on an issue:

```typescript
// src/admin/widgets/MetadataWidget.tsx
import { useState } from "react"
import type { ZonePropMap } from "@meridianjs/admin-dashboard/extensions"

type Props = ZonePropMap["issue.details.after"]

export function MetadataWidget({ issue }: Props) {
  // render custom UI using the full issue object
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Custom Section
      </p>
      <p className="text-sm mt-2">{issue.title}</p>
    </div>
  )
}
```

```typescript
// src/admin/widgets/index.tsx
import { defineWidgets } from "@meridianjs/admin-dashboard/extensions"
import { MetadataWidget } from "./MetadataWidget"

export default defineWidgets([
  { zone: "issue.details.after", component: MetadataWidget },
])
```

---

## React Sharing

Widget bundles are compiled with esbuild and loaded as ESM modules at runtime. The `meridian serve-dashboard` command rewrites `import React from 'react'` inside your widget bundle to use `window.__React` — the same React instance already loaded by the dashboard. This avoids duplicate React instances and hook failures.

---

## Running with Widgets

```bash
# Compile API + dashboard + widgets in one step
meridian dev

# Or serve the dashboard independently (compiles widgets automatically)
meridian serve-dashboard
```

If `src/admin/widgets/index.tsx` does not exist, the dashboard runs normally with no extensions loaded.
