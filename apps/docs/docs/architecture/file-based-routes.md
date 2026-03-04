---
id: file-based-routes
title: File-Based Routes
description: Route file conventions, named HTTP method exports, and middleware config.
sidebar_position: 4
---

# File-Based Routes

MeridianJS auto-discovers API routes by scanning the `src/api/` directory (and any plugin `api/` directories). No manual Express router registration required.

---

## File-to-URL Mapping

| File path | HTTP route |
|---|---|
| `src/api/admin/projects/route.ts` | `/admin/projects` |
| `src/api/admin/projects/[id]/route.ts` | `/admin/projects/:id` |
| `src/api/admin/projects/[id]/statuses/route.ts` | `/admin/projects/:id/statuses` |
| `src/api/auth/login/route.ts` | `/auth/login` |
| `src/api/webhooks/github/route.ts` | `/webhooks/github` |

Each file must be named exactly `route.ts`. Dynamic segments use the `[param]` bracket syntax.

---

## Named Method Exports

Each route file exports named functions for each HTTP method it handles:

```typescript
// src/api/admin/projects/route.ts
import type { ProjectModuleService } from '@meridianjs/project'

export async function GET(req: any, res: any) {
  const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
  const projects = await svc.listProjects()
  res.json(projects)
}

export async function POST(req: any, res: any) {
  const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
  const project = await svc.createProject(req.body)
  res.status(201).json(project)
}
```

Supported exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

---

## Dynamic Route Params

```typescript
// src/api/admin/projects/[id]/route.ts
export async function GET(req: any, res: any) {
  const { id } = req.params
  const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
  const project = await svc.retrieveProject(id)
  res.json(project)
}

export async function DELETE(req: any, res: any) {
  const { id } = req.params
  const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
  await svc.deleteProject(id)
  res.status(204).send()
}
```

---

## Middleware Configuration

Apply middleware to route prefixes in `src/api/middlewares.ts`:

```typescript
// src/api/middlewares.ts
import { authenticateJWT, requireRoles } from '@meridianjs/auth'
import { authRateLimit, apiRateLimit } from '@meridianjs/framework'

export default {
  routes: [
    {
      matcher: '/auth',
      middlewares: [authRateLimit],
    },
    {
      matcher: '/admin',
      middlewares: [apiRateLimit, authenticateJWT],
    },
    {
      matcher: '/admin/workspaces',
      middlewares: [requireRoles('admin', 'super-admin')],
    },
  ],
}
```

Matchers are prefix-matched. The most specific matcher wins. Middlewares are applied in array order.

---

## Using Workflows in Routes

All state-changing routes should run a workflow rather than calling service methods directly:

```typescript
// src/api/admin/projects/route.ts
import { createProjectWorkflow } from '@meridianjs/meridian'

export async function POST(req: any, res: any) {
  const { result, errors, transaction_status } =
    await createProjectWorkflow(req.scope).run({ input: req.body })

  if (transaction_status === 'reverted') {
    res.status(500).json({ error: { message: errors[0].message } })
    return
  }

  res.status(201).json(result)
}
```

The workflow handles compensation automatically if any step fails — all previously committed steps are rolled back in reverse order.
