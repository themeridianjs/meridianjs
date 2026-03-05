# @meridianjs/framework

The MeridianJS application runtime. Handles bootstrapping, the Awilix DI container, Express server setup, file-based route / subscriber / job / link loading, plugin registration, rate limiting, input validation, and SSE.

## Installation

```bash
npm install @meridianjs/framework
```

## Quick Start

```typescript
// src/main.ts
import { bootstrap } from "@meridianjs/framework"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const app = await bootstrap({ rootDir })
await app.start()

process.on("SIGTERM", async () => { await app.stop(); process.exit(0) })
process.on("SIGINT",  async () => { await app.stop(); process.exit(0) })
```

`bootstrap()` reads `meridian.config.ts` from `rootDir`, loads all modules and plugins, registers file-based routes and subscribers, and returns a `MeridianApp` handle.

## Configuration

Define your config in `meridian.config.ts` at the project root:

```typescript
import { defineConfig } from "@meridianjs/framework"
import dotenv from "dotenv"
dotenv.config()

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret:   process.env.JWT_SECRET!,
    httpPort:    Number(process.env.PORT) || 9000,
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5174",
      credentials: true,
    },
  },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

## File-based Routes

Create route files under `src/api/` and export named HTTP method handlers:

```
src/api/admin/projects/route.ts          → GET /admin/projects, POST /admin/projects
src/api/admin/projects/[id]/route.ts     → GET /admin/projects/:id, PUT, DELETE
```

```typescript
// src/api/admin/projects/route.ts
import type { Request, Response } from "express"

export const GET = async (req: Request, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const projects = await svc.listProjects()
  res.json({ projects })
}

export const POST = async (req: Request, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const project = await svc.createProject(req.body)
  res.status(201).json({ project })
}
```

## Middleware

Define route-level middleware in `src/api/middlewares.ts`:

```typescript
import { authenticateJWT } from "@meridianjs/auth"
import { apiRateLimit, authRateLimit } from "@meridianjs/framework"

export default {
  routes: [
    { matcher: "/auth",  middlewares: [authRateLimit] },
    { matcher: "/admin", middlewares: [apiRateLimit, authenticateJWT] },
  ],
}
```

## Rate Limiting

```typescript
import { authRateLimit, oauthRateLimit, apiRateLimit } from "@meridianjs/framework"

// authRateLimit  — 20 req / 15 min (for /auth endpoints)
// oauthRateLimit — 30 req / 15 min (for OAuth flows)
// apiRateLimit   — 200 req / 15 min (for /admin endpoints)
```

## Input Validation

```typescript
import { validate } from "@meridianjs/framework"
import { z } from "zod"

const schema = z.object({ name: z.string().min(1), color: z.string() })

export const POST = async (req: Request, res: Response) => {
  const body = validate(req.body, schema)  // throws 400 with field errors on failure
  // body is typed as z.infer<typeof schema>
}
```

## SSE — Server-Sent Events

Push real-time updates to connected dashboard clients:

```typescript
import { sseManager } from "@meridianjs/framework"

// In a subscriber or route handler:
sseManager.broadcast({ type: "issue.updated", payload: { id: issue.id } })
```

Clients connect via `GET /admin/events`. The dashboard uses this to invalidate TanStack Query caches without polling.

## Exports

| Export | Description |
|---|---|
| `bootstrap(options)` | Boot the application, return `MeridianApp` |
| `defineConfig(config)` | Type-safe config helper |
| `defineMiddlewares(config)` | Type-safe middleware config helper |
| `createMeridianContainer()` | Create a raw Awilix container |
| `ConsoleLogger` | Default logger implementation |
| `validate(data, schema)` | Zod validation with auto 400 response |
| `authRateLimit` | Rate limiter for auth routes |
| `apiRateLimit` | Rate limiter for API routes |
| `sseManager` | SSE broadcast singleton |
| `loadRoutes`, `loadModules`, `loadSubscribers`, `loadJobs`, `loadLinks`, `loadPlugins` | Low-level loaders (plugin authors) |

## License

MIT
