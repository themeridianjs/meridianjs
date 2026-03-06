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

## Authentication and access control

All routes under `/admin/*` are protected by `authenticateJWT` by default (configured in `src/api/middlewares.ts`). Any request without a valid JWT is rejected with `401 Unauthorized`.

To get a token, call `POST /auth/login` and pass the returned token as `Authorization: Bearer <token>` on subsequent requests. Any authenticated user — regardless of role — can reach the route unless you add a role guard.

### Restricting by role

Use `requireRoles()` in `middlewares.ts` to restrict an entire route prefix to specific roles:

```typescript
// src/api/middlewares.ts
import { authenticateJWT, requireRoles } from "@meridianjs/auth"

export default {
  routes: [
    { matcher: "/admin", middlewares: [authenticateJWT] },
    // Only admins can access time-log routes
    { matcher: "/admin/time-logs", middlewares: [requireRoles("admin", "super-admin")] },
  ],
}
```

Or apply it inline on a single handler:

```typescript
import { requireRoles } from "@meridianjs/auth"

export const DELETE = async (req: any, res: any) => {
  requireRoles("admin", "super-admin")(req, res, async () => {
    await req.scope.resolve("timeLogModuleService").deleteTimeLog(req.params.id)
    res.status(204).send()
  })
}
```

### Restricting by permission

For finer control, define custom permissions via the `@meridianjs/app-role` module and use `requirePermission()`:

```typescript
import { requirePermission } from "@meridianjs/auth"

export const POST = async (req: any, res: any) => {
  requirePermission("time-log:write")(req, res, async () => {
    const svc = req.scope.resolve("timeLogModuleService") as any
    const log = await svc.createTimeLog(req.body)
    res.status(201).json({ time_log: log })
  })
}
```

Users whose `AppRole` includes `"time-log:write"` are allowed through. Super-admins bypass all permission checks.

See [RBAC & Permissions](../auth/rbac) for the full guide.
