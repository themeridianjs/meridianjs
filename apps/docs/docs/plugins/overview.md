---
id: overview
title: Plugin System
description: Plugin definition, pluginRoot, register(), addModule(), and auto-scan directories.
sidebar_position: 1
---

# Plugin System

Plugins are the primary extension mechanism in MeridianJS. A plugin can:

- Add new API routes
- Register new modules (and their services)
- Add subscribers, scheduled jobs, and module links
- Extend the admin dashboard with custom pages and widgets

---

## Plugin Structure

A plugin is an npm package (or a local path) that exports:

- `pluginRoot` — absolute path to the plugin's root directory (used for auto-scanning)
- A default `register()` function (optional) — for declaring required modules

```typescript
// packages/my-plugin/src/index.ts
import path from 'path'
import type { PluginRegistrationContext } from '@meridianjs/types'
import MyCustomModule from './modules/my-custom'

export const pluginRoot = path.resolve(__dirname, '..')

export default async function register(ctx: PluginRegistrationContext): Promise<void> {
  // Declare a module that this plugin requires
  await ctx.addModule({ resolve: MyCustomModule })
}
```

---

## Auto-Scanned Directories

When a plugin declares `pluginRoot`, the framework auto-scans these subdirectories:

| Directory | What it loads |
|---|---|
| `api/` | Route files (`route.ts`) — mounted on Express |
| `subscribers/` | Subscriber config files — registered on event bus |
| `jobs/` | Cron job files — registered on job queue |
| `links/` | Link definition files — creates junction tables |

The same conventions apply as in the main app's `src/` directory.

---

## `PluginRegistrationContext`

The `ctx` object passed to `register()` provides:

```typescript
interface PluginRegistrationContext {
  // Register a module to be loaded as part of this plugin
  addModule(config: { resolve: ModuleDefinition | string, options?: Record<string, unknown> }): Promise<void>

  // Access the root DI container (read-only at registration time)
  container: MeridianContainer
}
```

---

## Declaring a Plugin in Config

```typescript
// meridian.config.ts
export default defineConfig({
  projectConfig: { /* ... */ },
  modules: [/* infrastructure modules */],
  plugins: [
    { resolve: '@meridianjs/meridian' },             // default plugin
    { resolve: '@meridianjs/plugin-webhook' },        // webhook receiver
    { resolve: './src/plugins/my-plugin/index.ts' },  // local plugin
    {
      resolve: '@meridianjs-pro/plugin-github',
      options: {
        licenseKey: process.env.GITHUB_PLUGIN_LICENSE_KEY,
        githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
      },
    },
  ],
})
```

---

## The Default Plugin (`@meridianjs/meridian`)

The `@meridianjs/meridian` plugin is what bootstraps the entire core platform. It:

1. Calls `ctx.addModule()` for all 12 core domain modules
2. Scans its own `api/` directory — providing all the default REST endpoints
3. Scans its own `subscribers/` directory — providing notification + activity subscribers
4. Scans its own `links/` directory — providing the module link tables

Users never need to manually load core modules — they are all handled by this plugin.

---

## Disabling Built-in Subscribers

Every plugin's subscribers can be selectively disabled using the `disableSubscribers` option in `meridian.config.ts`. Pass the event name(s) you want to suppress, and the framework will skip registering that subscriber entirely — letting you handle those events yourself in `src/subscribers/`.

```typescript
// meridian.config.ts
plugins: [
  {
    resolve: '@meridianjs/meridian',
    disableSubscribers: ['issue.assigned', 'comment.created'],
  },
],
```

### Built-in system events from `@meridianjs/meridian`

| Event | Default behaviour |
|---|---|
| `issue.created` | Creates in-app notification + sends email to assignees / reporter |
| `issue.assigned` | Creates in-app notification + sends email to new assignees |
| `comment.created` | Creates in-app notification + sends email to assignees, reporter, and mentioned users |
| `issue.status_changed` | Records activity log entry |
| `project.member_added` | Creates in-app notification + sends email to the added member |
| `workspace.member_invited` | Sends invitation email with the accept link |
| `password.reset_requested` | Sends password-reset email |
| `password.otp_requested` | Sends OTP verification email for password create/change |

### Example — custom assignment email

```typescript
// meridian.config.ts
plugins: [
  {
    resolve: '@meridianjs/meridian',
    // Disable the built-in handler so we can send our own branded email
    disableSubscribers: ['issue.assigned'],
  },
],
```

```typescript
// src/subscribers/issue-assigned.ts
import type { SubscriberArgs, SubscriberConfig } from '@meridianjs/types'

export default async function handler({ event, container }: SubscriberArgs) {
  const { issue_id, assignee_ids, actor_id } = event.data as any
  const emailService = container.resolve('emailService') as any
  const userService  = container.resolve('userModuleService') as any
  const issueService = container.resolve('issueModuleService') as any

  const issue = await issueService.retrieveIssue(issue_id)

  await Promise.allSettled(
    (assignee_ids as string[])
      .filter((id: string) => id !== actor_id)
      .map(async (userId: string) => {
        const user = await userService.retrieveUser(userId)
        if (!user?.email) return
        await emailService.send({
          to: user.email,
          subject: `[${issue.identifier}] You've been assigned: ${issue.title}`,
          text: `Hi ${user.first_name ?? 'there'}, you were assigned to "${issue.title}".`,
        })
      })
  )
}

export const config: SubscriberConfig = { event: 'issue.assigned' }
```

:::tip
You can disable multiple events at once. Any event name not listed in `disableSubscribers` continues to use the built-in subscriber unchanged.
:::

---

## Creating a Local Plugin

You can create a plugin inside your own app for organizational purposes:

```
src/
  plugins/
    my-feature/
      index.ts          ← pluginRoot + register()
      api/
        admin/
          my-feature/
            route.ts
      subscribers/
        on-something.ts
```

```typescript
// src/plugins/my-feature/index.ts
import path from 'path'
export const pluginRoot = path.resolve(__dirname, '.')
export default async function register() {}
```

Then in `meridian.config.ts`:
```typescript
plugins: [
  { resolve: '@meridianjs/meridian' },
  { resolve: './src/plugins/my-feature/index.ts' },
]
```
