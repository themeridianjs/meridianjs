# Meridian

Open-source project management framework — a self-hosted, developer-first alternative to Asana and Jira. Medusa.js-inspired architecture, NPX-installable, fully extensible via modules and plugins.

## Features

- **Modular architecture** — swap or extend any domain module (users, projects, issues, sprints, etc.)
- **File-based API routes** — drop a `route.ts` file in `src/api/` and it becomes an endpoint
- **Workflow engine** — DAG runner with LIFO saga compensation for safe multi-step mutations
- **Event bus** — local EventEmitter for dev, BullMQ + Redis for production
- **Scheduler** — in-process cron for dev, BullMQ cron for production
- **Admin dashboard** — Linear.app-inspired React SPA with Kanban board, issue tracking, sprint management, and workspace settings
- **Plugin system** — extend with custom modules, routes, subscribers, and jobs
- **Widget zones** — inject custom React components into named slots in the admin UI
- **RBAC** — JWT-based auth with role and permission guards
- **CLI** — scaffold new projects with `npx create-meridian-app`

## Quick Start

```bash
npx create-meridian-app my-app
cd my-app
npm install

# Start the backend (requires PostgreSQL)
meridian dev

# Start the admin dashboard
meridian serve-dashboard
```

## Monorepo Structure

```
meridian/
├── packages/
│   ├── types/                   @meridianjs/types
│   ├── framework-utils/         @meridianjs/framework-utils
│   ├── framework/               @meridianjs/framework
│   ├── event-bus-local/         @meridianjs/event-bus-local
│   ├── event-bus-redis/         @meridianjs/event-bus-redis
│   ├── job-queue-local/         @meridianjs/job-queue-local
│   ├── job-queue-redis/         @meridianjs/job-queue-redis
│   ├── workflow-engine/         @meridianjs/workflow-engine
│   ├── meridian/                @meridianjs/meridian          (default plugin)
│   ├── plugin-webhook/          @meridianjs/plugin-webhook
│   ├── modules/
│   │   ├── user/                @meridianjs/user
│   │   ├── workspace/           @meridianjs/workspace
│   │   ├── auth/                @meridianjs/auth
│   │   ├── project/             @meridianjs/project
│   │   ├── issue/               @meridianjs/issue
│   │   ├── sprint/              @meridianjs/sprint
│   │   ├── activity/            @meridianjs/activity
│   │   ├── notification/        @meridianjs/notification
│   │   ├── invitation/          @meridianjs/invitation
│   │   ├── workspace-member/    @meridianjs/workspace-member
│   │   ├── team-member/         @meridianjs/team-member
│   │   └── project-member/      @meridianjs/project-member
│   ├── ui/
│   │   └── admin-dashboard/     @meridianjs/admin-dashboard
│   └── create-meridian-app/     create-meridian-app
└── apps/
    └── test-app/                integration test app
```

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ + TypeScript 5.4 |
| HTTP | Express.js |
| ORM | MikroORM 6 + PostgreSQL |
| DI | Awilix (PROXY mode) |
| Build | Turbo + tsup |
| Events (dev) | Node.js EventEmitter |
| Events (prod) | BullMQ + Redis |
| Scheduler (dev) | In-process cron |
| Scheduler (prod) | BullMQ cron |
| Validation | Zod |
| UI | React 18 + Vite + TanStack Query + Tailwind + shadcn/ui |
| CLI | Commander.js |
| Testing | Vitest |

## Configuration

All core modules are auto-loaded by the `@meridianjs/meridian` plugin. A minimal config looks like:

```typescript
// meridian.config.ts
import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    httpPort: 9000,
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

## Modules vs Plugins

Meridian has two extension primitives. Choosing the right one depends on whether you need to **store data** or **add behaviour**.

### Module — use when you need a new entity

A module owns a single bounded context: a data model, a database schema, and the business logic to manage it. It has no knowledge of HTTP or events.

**Create a module when you need to:**
- Persist a new type of data (e.g. `Client`, `Invoice`, `Document`)
- Add custom CRUD or domain methods on top of that data
- Make the data linkable to other modules (foreign-key-free joins via `linkable`)

```typescript
// src/modules/client/index.ts
import { Module, MeridianService, model } from "@meridianjs/framework-utils"

const ClientModel = model.define("client", {
  id:      model.id(),
  name:    model.text(),
  email:   model.text(),
})

class ClientModuleService extends MeridianService({ Client: ClientModel }) {
  constructor(container) { super(container) }
  // Auto-generated: listClients, retrieveClient, createClient, updateClient, deleteClient

  async findByEmail(email: string) {
    const repo = this.container.resolve("clientRepository")
    return repo.findOne({ email })
  }
}

export default Module("clientModuleService", {
  service: ClientModuleService,
  models: [ClientModel],
})
```

Register in `meridian.config.ts`:

```typescript
modules: [{ resolve: "./src/modules/client/index.ts" }]
```

Resolve in any route handler:

```typescript
const clients = req.scope.resolve("clientModuleService") as ClientModuleService
```

---

### Plugin — use when you need routes, events, or jobs

A plugin is a deployable feature package. It has no schema of its own but wires together API routes, event subscribers, and cron jobs — and can declare which modules it depends on via `ctx.addModule()`.

**Create a plugin when you need to:**
- Add a group of related API routes (e.g. a billing integration, a reporting feature)
- Handle domain events and trigger side-effects (emails, webhooks, syncs)
- Run scheduled background jobs
- Ship a reusable feature to other Meridian projects as an npm package

```
src/plugins/billing/
├── api/
│   └── admin/billing/route.ts      ← auto-registered as GET/POST /admin/billing
├── subscribers/
│   └── invoice-paid.ts             ← auto-registered for the "invoice.paid" event
├── jobs/
│   └── send-reminders.ts           ← auto-registered as a cron job
└── index.ts                        ← pluginRoot + register()
```

```typescript
// src/plugins/billing/index.ts
import path from "path"
import type { PluginRegistrationContext } from "@meridianjs/types"

export const pluginRoot = path.resolve(__dirname, "..")

export default async function register(ctx: PluginRegistrationContext) {
  // Declare the modules this plugin needs — loaded before routes are mounted
  await ctx.addModule({ resolve: "./src/modules/invoice/index.ts" })
}
```

Register in `meridian.config.ts`:

```typescript
plugins: [
  { resolve: "@meridianjs/meridian" },           // core plugin
  { resolve: "./src/plugins/billing/index.ts" },  // your plugin
]
```

---

### Quick comparison

| | Module | Plugin |
|---|---|---|
| Has a database schema | Yes | No (loads modules that do) |
| Registered in | `modules[]` | `plugins[]` |
| Primary export | `Module(...)` default | `pluginRoot` + `register()` |
| Owns | Data model + service | Routes + subscribers + jobs |
| Visible to routes as | `req.scope.resolve("myModuleService")` | auto-scanned directories |
| Publish as npm package | Yes | Yes |

**Rule of thumb:** if you're asking "where does this data live?", you need a module. If you're asking "what should happen when X occurs?", you need a plugin. Most non-trivial features need both — a module for storage and a plugin (or the default `@meridianjs/meridian` plugin) to expose it over HTTP.

---

## Custom Modules

```typescript
import { Module, MeridianService, model } from "@meridianjs/framework-utils"

const MyModel = model.define("my_model", {
  id: model.id(),
  name: model.text(),
})

class MyModuleService extends MeridianService({ MyModel }) {
  constructor(container) { super(container) }
  // Auto-generated: listMyModels, retrieveMyModel, createMyModel, updateMyModel, deleteMyModel
}

export default Module("myModuleService", {
  service: MyModuleService,
  models: [MyModel],
})
```

Add it to your config:

```typescript
modules: [{ resolve: "./src/modules/my-module/index.ts" }]
```

## API Routes

Create files under `src/api/` — they are auto-registered:

```typescript
// src/api/admin/my-resource/route.ts
import type { Request, Response } from "express"

export async function GET(req: Request, res: Response) {
  const svc = req.scope.resolve("myModuleService") as MyModuleService
  const items = await svc.listMyModels()
  res.json({ items })
}
```

## Admin Dashboard Widgets

Inject custom React components into named zones in the admin UI:

```typescript
// src/admin/widgets/index.tsx
import { defineWidgets } from "@meridianjs/admin-dashboard"

export default defineWidgets([
  {
    zone: "issue.details.after",
    component: ({ issue }) => <div>Custom content for {issue.id}</div>,
  },
])
```

Available zones: `login.before/after`, `issue.details.before/after/sidebar`, `project.board.before/after`, `project.issues.before/after`, `project.timeline.before/after`, `project.sprints.before/after`, `workspace.settings.before/after`.

## Development

```bash
# Install dependencies
npm install

# Build all packages
npx turbo run build

# Run the test app (requires PostgreSQL: createdb meridian_test)
node --import tsx/esm apps/test-app/src/main.ts

# Run the admin dashboard
cd packages/ui/admin-dashboard && npm run dev

# Run tests
npm test
```

## Publishing

All packages are published under the `@meridianjs/` npm scope:

```bash
# Build and publish a single package
cd packages/<name>
npm version patch
npm publish --access public
```

## License

MIT
