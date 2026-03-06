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
