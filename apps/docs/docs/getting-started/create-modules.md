---
id: create-modules
title: How to Create Modules
description: Scaffold and register a custom Meridian module.
sidebar_position: 4
---

# How to Create Modules

Create a module:

```bash
npm run generate -- module time-log
# or: npx meridian generate module time-log
```

Generated files:

```text
src/modules/time-log/index.ts
src/modules/time-log/models/time-log.ts
src/modules/time-log/loaders/default.ts
src/modules/time-log/service.ts
```

Register the module in `meridian.config.ts`:

```ts
export default defineConfig({
  // ...
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "./src/modules/time-log" },
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

Then sync schema:

```bash
npm run db:migrate
```

## Service token naming

The module key becomes the DI container token. It is derived from the generated module name using camelCase with a `ModuleService` suffix:

| Module name | Service token |
|---|---|
| `time-log` | `timeLogModuleService` |
| `my-feature` | `myFeatureModuleService` |

## Using the module in a route

Resolve the service from `req.scope` inside any route handler:

```ts
// src/api/admin/time-logs/route.ts
import type { Request, Response } from "express"

export const GET = async (req: Request, res: Response) => {
  const svc = req.scope.resolve("timeLogModuleService") as any
  const logs = await svc.listTimeLogs()
  res.json({ time_logs: logs })
}

export const POST = async (req: Request, res: Response) => {
  const svc = req.scope.resolve("timeLogModuleService") as any
  const log = await svc.createTimeLog(req.body)
  res.status(201).json({ time_log: log })
}
```

All CRUD methods are auto-generated: `list<Plural>`, `listAndCount<Plural>`, `retrieve<Singular>`, `create<Singular>`, `update<Singular>`, `delete<Singular>`, `softDelete<Singular>`.
