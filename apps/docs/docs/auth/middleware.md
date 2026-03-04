---
id: middleware
title: Auth Middleware
description: authenticateJWT middleware, req.user shape, and middlewares.ts config.
sidebar_position: 3
---

# Auth Middleware

The `authenticateJWT` middleware verifies the `Authorization: Bearer <token>` header and attaches the decoded payload to `req.user`. All `/admin/*` routes use it by default.

---

## `authenticateJWT`

```typescript
import { authenticateJWT } from '@meridianjs/auth'

// Apply globally in middlewares.ts
export default {
  routes: [
    { matcher: '/admin', middlewares: [authenticateJWT] },
  ],
}
```

What it does:
1. Reads the `Authorization` header
2. Verifies the JWT using `config.projectConfig.jwtSecret`
3. On success: calls `next()` with `req.user` populated
4. On failure: responds `401 Unauthorized`

---

## `req.user` Shape

After `authenticateJWT` runs, `req.user` is available in all downstream handlers:

```typescript
interface AuthenticatedUser {
  id: string           // user.id
  email: string
  workspaceId: string
  roles: string[]      // built-in roles + custom AppRole permission strings
}
```

Access it in route handlers:

```typescript
export async function GET(req: any, res: any) {
  const userId = req.user.id
  const roles = req.user.roles

  // ...
}
```

---

## Rate Limiting

Two rate limiters are provided by `@meridianjs/framework`:

| Export | Default limit | Apply to |
|---|---|---|
| `authRateLimit` | 10 requests / 15 min | `/auth/*` routes |
| `apiRateLimit` | 100 requests / 1 min | `/admin/*` routes |

```typescript
import { authRateLimit, apiRateLimit } from '@meridianjs/framework'

export default {
  routes: [
    { matcher: '/auth',  middlewares: [authRateLimit] },
    { matcher: '/admin', middlewares: [apiRateLimit, authenticateJWT] },
  ],
}
```

Limits are configurable in `projectConfig`:

```typescript
projectConfig: {
  rateLimits: {
    auth: { windowMs: 15 * 60 * 1000, max: 10 },
    api:  { windowMs: 60 * 1000, max: 100 },
  }
}
```

---

## Zod Validation Middleware

Use the `validate` helper from `@meridianjs/framework` to validate request bodies:

```typescript
import { validate } from '@meridianjs/framework'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  identifier: z.string().min(2).max(10).toUpperCase(),
  workspace_id: z.string().uuid(),
})

export async function POST(req: any, res: any) {
  const body = validate(CreateProjectSchema, req.body, res)
  if (!body) return  // validate() sends 400 automatically on failure

  // body is typed as z.infer<typeof CreateProjectSchema>
  const { result } = await createProjectWorkflow(req.scope).run({ input: body })
  res.status(201).json(result)
}
```

---

## Security Headers

[Helmet](https://helmetjs.github.io/) is applied globally by the framework and adds these headers automatically:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `X-XSS-Protection`

No configuration needed — these are always on in production.
