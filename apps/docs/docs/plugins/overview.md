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
