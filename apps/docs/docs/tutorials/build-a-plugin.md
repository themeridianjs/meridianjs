---
id: build-a-plugin
title: "Tutorial: Build a Plugin — Due Date Reminder"
description: Step-by-step guide to building a Meridian plugin that sends daily due-date notifications using a cron job, event subscriber, and API route.
sidebar_position: 2
---

# Tutorial: Build a Plugin — Due Date Reminder

This tutorial walks you through building a **`DueDateReminder` plugin** from scratch. By the end you will have a working plugin that:

- Runs a **daily cron job** at 08:00 to find issues due within 48 hours
- Emits an `issue.due_soon` event for each matching issue
- Handles the event in a **subscriber** that creates in-app notifications for assignees
- Exposes a **`GET /admin/issues/due-soon`** route for on-demand access to the same list

:::info When to use a plugin
Create a plugin any time you need to add **behaviour** — scheduled jobs, event handlers, or API endpoints — without needing a new database table. This plugin reads entirely from the existing `issue` module; it stores nothing itself. The `@meridianjs/meridian` plugin has already loaded `issueModuleService` into the container, so your plugin can resolve it directly.
:::

---

## What we're building

```
User's issues get a due_date set
  → Every morning at 08:00, the cron job runs
  → Issues due within 48h are collected
  → An issue.due_soon event is emitted per issue
  → The subscriber handles each event → creates a Notification for each assignee
  → Assignees see a notification bell alert in the dashboard
```

The `GET /admin/issues/due-soon` route lets the dashboard (or any API client) fetch the same list on demand without waiting for the cron.

---

## File structure

```
src/plugins/due-date-reminder/
├── api/
│   └── admin/
│       └── issues/
│           └── due-soon/
│               └── route.ts
├── subscribers/
│   └── issue-due-soon.ts
├── jobs/
│   └── check-due-dates.ts
└── index.ts
```

---

## Step 1 — Create the plugin entry point

The entry file must export `pluginRoot` (so the framework knows where to auto-scan) and optionally a `register()` function for declaring module dependencies.

```typescript
// src/plugins/due-date-reminder/index.ts
import path from "path"
import { fileURLToPath } from "url"
import type { PluginRegistrationContext } from "@meridianjs/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Tell the framework where to scan for api/, subscribers/, jobs/
export const pluginRoot = path.resolve(__dirname, ".")

export default async function register(_ctx: PluginRegistrationContext): Promise<void> {
  // No extra modules to load — issueModuleService and notificationModuleService
  // are already provided by @meridianjs/meridian.
}
```

:::note
If your plugin needed a module that isn't loaded by the core plugin, you'd call `ctx.addModule({ resolve: "..." })` here. Modules declared this way are loaded before any routes or subscribers are mounted.
:::

---

## Step 2 — Write the cron job

Any file in `jobs/` that exports a default handler and a `config` object is automatically registered as a scheduled job.

```typescript
// src/plugins/due-date-reminder/jobs/check-due-dates.ts
import type { JobArgs, JobConfig } from "@meridianjs/types"

export default async function handler({ container }: JobArgs): Promise<void> {
  const issueService = container.resolve("issueModuleService") as any
  const eventBus     = container.resolve("eventBus")           as any
  const logger       = container.resolve("logger")             as any

  // Calculate the cutoff: issues due at or before this date are "due soon"
  const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const cutoffDate = cutoff.toISOString().split("T")[0]  // "YYYY-MM-DD"

  const issues: any[] = await issueService.listIssues({ due_date_lte: cutoffDate, status_not: "done" })

  logger.info(`[due-date-reminder] ${issues.length} issue(s) due within 48h`)

  for (const issue of issues) {
    await eventBus.emit({
      name: "issue.due_soon",
      data: {
        issue_id:     issue.id,
        due_date:     issue.due_date,
        assignee_ids: issue.assignee_ids ?? [],
      },
    })
  }
}

export const config: JobConfig = {
  name:     "check-due-dates",
  schedule: "0 8 * * *",  // every day at 08:00
}
```

The `schedule` field uses standard cron syntax. In development the `@meridianjs/job-queue-local` adapter runs jobs in-process; in production swap to `@meridianjs/job-queue-redis` for distributed scheduling.

---

## Step 3 — Write the subscriber

Any file in `subscribers/` that exports a default handler and a `config` object is automatically registered on the event bus.

```typescript
// src/plugins/due-date-reminder/subscribers/issue-due-soon.ts
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

interface IssueDueSoonData {
  issue_id:     string
  due_date:     string
  assignee_ids: string[]
}

export default async function handler({ event, container }: SubscriberArgs<IssueDueSoonData>): Promise<void> {
  const { issue_id, due_date, assignee_ids } = event.data
  if (!assignee_ids.length) return

  const notifService = container.resolve("notificationModuleService") as any
  const issueService = container.resolve("issueModuleService")        as any

  const issue = await issueService.retrieveIssue(issue_id)

  await Promise.all(
    assignee_ids.map((userId: string) =>
      notifService.createNotification({
        user_id:      userId,
        entity_type:  "issue",
        entity_id:    issue_id,
        action:       "due_soon",
        message:      `[${issue.identifier}] "${issue.title}" is due on ${due_date}`,
        workspace_id: issue.workspace_id,
      })
    )
  )
}

export const config: SubscriberConfig = { event: "issue.due_soon" }
```

The subscriber runs every time `issue.due_soon` is emitted — both from the cron job and from any other part of the system that emits the same event in the future.

---

## Step 4 — Write the route

Route files follow the same file-based conventions as the rest of the app. The directory path under `api/` maps directly to the URL.

```typescript
// src/plugins/due-date-reminder/api/admin/issues/due-soon/route.ts
import type { Request, Response } from "express"

export async function GET(req: Request, res: Response) {
  const issueService = (req as any).scope.resolve("issueModuleService") as any

  const cutoff     = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const cutoffDate = cutoff.toISOString().split("T")[0]

  const issues = await issueService.listIssues({ due_date_lte: cutoffDate, status_not: "done" })
  res.json({ issues })
}
```

This registers `GET /admin/issues/due-soon` automatically — no manual Express registration needed.

---

## Step 5 — Register in config

```typescript
// meridian.config.ts
export default defineConfig({
  projectConfig: { /* ... */ },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
    { resolve: "./src/plugins/due-date-reminder/index.ts" }, // ← add this
  ],
})
```

The cron job, subscriber, and route are all picked up automatically from the scanned directories. No further registration is needed.

---

## What you built

| Piece | File | Triggered by |
|---|---|---|
| Cron job | `jobs/check-due-dates.ts` | Daily at 08:00 |
| Event | `issue.due_soon` | Emitted by the cron job |
| Subscriber | `subscribers/issue-due-soon.ts` | Every `issue.due_soon` event |
| Route | `api/admin/issues/due-soon/route.ts` | `GET /admin/issues/due-soon` |

The plugin adds real-time-relevant behaviour to the platform without touching any schema and without modifying the core issue module.

---

## Module vs Plugin — side by side

Now that you've built both, here's how they compare:

| | Module (Budget Tracker) | Plugin (Due Date Reminder) |
|---|---|---|
| Creates a DB table | Yes | No |
| Auto-generated CRUD | Yes | No |
| Custom service methods | Yes | No |
| Cron job | No | Yes |
| Event subscriber | No | Yes |
| HTTP route | Added separately | Bundled inside the plugin |
| Depends on other modules | No (standalone) | Yes — reads `issueModuleService` |
| Registered in config under | `modules[]` | `plugins[]` |

**Rule of thumb:** if you're asking _"where does this data live?"_, you need a module. If you're asking _"what should happen when X occurs?"_, you need a plugin.
