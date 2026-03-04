---
id: overview
title: Architecture Overview
description: Monorepo structure, tech stack, and application lifecycle.
sidebar_position: 1
---

# Architecture Overview

MeridianJS is a modular, event-driven project management framework modeled after [Medusa.js](https://medusajs.com). The key idea is that every domain concept lives in an isolated **module** with its own database connection, service, and DI container — and modules communicate via typed events rather than direct imports.

---

## Monorepo Structure

```
meridian/
├── packages/
│   ├── types/                   @meridianjs/types              — shared TypeScript interfaces
│   ├── framework-utils/         @meridianjs/framework-utils    — DML, MeridianService, Module(), defineLink()
│   ├── framework/               @meridianjs/framework          — bootstrap, DI, loaders, Express server
│   ├── event-bus-local/         @meridianjs/event-bus-local    — Node EventEmitter (dev)
│   ├── event-bus-redis/         @meridianjs/event-bus-redis    — BullMQ + ioredis (prod)
│   ├── job-queue-local/         @meridianjs/job-queue-local    — in-process cron (dev)
│   ├── job-queue-redis/         @meridianjs/job-queue-redis    — BullMQ cron (prod)
│   ├── workflow-engine/         @meridianjs/workflow-engine    — DAG runner, createStep/createWorkflow
│   ├── meridian/                @meridianjs/meridian           — default plugin: all routes, workflows, links, subscribers
│   ├── plugin-webhook/          @meridianjs/plugin-webhook     — webhook receiver plugin
│   └── modules/
│       ├── user/                @meridianjs/user
│       ├── workspace/           @meridianjs/workspace
│       ├── auth/                @meridianjs/auth
│       ├── project/             @meridianjs/project
│       ├── issue/               @meridianjs/issue
│       ├── sprint/              @meridianjs/sprint
│       ├── activity/            @meridianjs/activity
│       ├── notification/        @meridianjs/notification
│       ├── invitation/          @meridianjs/invitation
│       ├── workspace-member/    @meridianjs/workspace-member
│       ├── team-member/         @meridianjs/team-member
│       └── project-member/      @meridianjs/project-member
├── packages/ui/
│   └── admin-dashboard/         @meridianjs/admin-dashboard    — Vite + React 18 SPA
├── packages/create-meridian-app/  create-meridian-app           — NPX CLI scaffolder
└── apps/
    └── test-app/                                               — integration test app (not published)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ + TypeScript 5.4 |
| HTTP | Express.js |
| ORM | MikroORM 6 + PostgreSQL |
| Dependency Injection | Awilix (PROXY mode) |
| Build | Turbo + tsup |
| Events (dev) | Node.js EventEmitter (`@meridianjs/event-bus-local`) |
| Events (prod) | BullMQ + Redis (`@meridianjs/event-bus-redis`) |
| Scheduler (dev) | In-process cron (`@meridianjs/job-queue-local`) |
| Scheduler (prod) | BullMQ cron (`@meridianjs/job-queue-redis`) |
| Validation | Zod |
| UI | React 18 + Vite + TanStack Query + Tailwind + shadcn/ui |
| CLI | Commander.js + `create-meridian-app` |
| Testing | Vitest |

---

## Application Lifecycle

When `bootstrap()` runs, the framework executes these phases in order:

1. **Config load** — reads `meridian.config.ts`, validates with Zod
2. **Root container** — creates the Awilix root container, registers `config`, `logger`
3. **Plugin load** — for each plugin in `plugins[]`, calls `register(PluginRegistrationContext)`, which may call `ctx.addModule()` to declare required modules
4. **Module load** — for each module (from plugins + explicit `modules[]`), creates a child Awilix scope and runs each loader; loaders set up the module's MikroORM instance and repositories
5. **Service instantiation** — `new ServiceClass(moduleContainer)` for each module
6. **Route scan** — scans `src/api/` (and plugin `api/` directories) for `route.ts` files, mounts them on Express
7. **Middleware load** — applies `src/api/middlewares.ts` matchers
8. **Subscriber load** — scans `src/subscribers/` and plugin subscriber directories, registers handlers
9. **Job load** — scans `src/jobs/` and registers cron jobs
10. **Link load** — scans `src/links/` and sets up module link tables
11. **Server start** — `app.listen(port)`

---

## Key Design Principles

- **Module isolation**: each module owns its DB connection, schema, and service. No shared ORM instance.
- **No direct module imports**: modules communicate via the event bus (`eventBus.emit()`), not `import`.
- **DI everywhere**: all services are resolved from the Awilix container via `req.scope.resolve("serviceName")`.
- **File-based conventions**: drop files in the right directory and the framework picks them up automatically.
- **Workflow-first mutations**: all state-changing operations go through a `createWorkflow()` step chain with LIFO compensation (saga pattern).
