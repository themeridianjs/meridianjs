# Meridian — Developer Reference

Open-source project management framework (Asana/Jira-equivalent), Medusa.js-inspired, NPX-installable. Full plan: `/Users/arjusmoon/.claude/plans/mellow-sprouting-parrot.md`

---

## Monorepo Structure

```
meridian/
├── packages/
│   ├── types/                   @meridianjs/types              — all shared TS interfaces
│   ├── framework-utils/         @meridianjs/framework-utils    — DML, MeridianService, Module(), defineLink()
│   ├── framework/               @meridianjs/framework          — bootstrap, DI, loaders, Express server
│   ├── event-bus-local/         @meridianjs/event-bus-local    — Node EventEmitter IEventBus (dev)
│   ├── event-bus-redis/         @meridianjs/event-bus-redis    — BullMQ + ioredis IEventBus (prod)
│   ├── job-queue-local/         @meridianjs/job-queue-local    — in-process cron scheduler (dev)
│   ├── job-queue-redis/         @meridianjs/job-queue-redis    — BullMQ cron scheduler (prod)
│   ├── workflow-engine/         @meridianjs/workflow-engine    — DAG runner, createStep/createWorkflow, LIFO compensation
│   ├── meridian/                @meridianjs/meridian           — default plugin: routes, workflows, links, subscribers; auto-loads all core modules
│   ├── plugin-webhook/          @meridianjs/plugin-webhook     — webhook receiver plugin
│   ├── modules/
│   │   ├── user/                @meridianjs/user               — User, Team models
│   │   ├── workspace/           @meridianjs/workspace          — Workspace model (multi-tenant)
│   │   ├── auth/                @meridianjs/auth               — JWT register/login, authenticateJWT, requireRoles guards
│   │   ├── project/             @meridianjs/project            — Project, Label, Milestone, ProjectStatus
│   │   ├── issue/               @meridianjs/issue              — Issue, Comment
│   │   ├── sprint/              @meridianjs/sprint             — Sprint/Cycle
│   │   ├── activity/            @meridianjs/activity           — Activity audit log
│   │   ├── notification/        @meridianjs/notification       — Notification model + service
│   │   ├── invitation/          @meridianjs/invitation         — Workspace invitation tokens
│   │   ├── workspace-member/    @meridianjs/workspace-member   — WorkspaceMember (workspace_id, user_id, role)
│   │   ├── team-member/         @meridianjs/team-member        — TeamMember (team_id, user_id)
│   │   └── project-member/      @meridianjs/project-member     — ProjectMember + ProjectTeam (project-level access)
│   ├── ui/
│   │   └── admin-dashboard/     @meridianjs/admin-dashboard    — Vite + React 18 + TanStack Query + Tailwind SPA
│   └── create-meridian-app/     create-meridian-app            — NPX CLI scaffolder + meridian dev/build/generate
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
| DI | Awilix (PROXY mode) |
| Build | Turbo + tsup |
| Events (dev) | Node.js EventEmitter (`@meridianjs/event-bus-local`) |
| Events (prod) | BullMQ + Redis (`@meridianjs/event-bus-redis`) |
| Scheduler (dev) | in-process cron (`@meridianjs/job-queue-local`) |
| Scheduler (prod) | BullMQ cron (`@meridianjs/job-queue-redis`) |
| Validation | Zod |
| UI | React 18 + Vite + TanStack Query + Tailwind + shadcn/ui + dnd-kit |
| CLI | Commander.js + `create-meridian-app` |
| Testing | Vitest |

---

## Architecture Patterns

### Module Definition
```typescript
export default Module("projectModuleService", {
  service: ProjectModuleService,  // extends MeridianService({ Project, Label })
  models: [Project, Label],
  loaders: [defaultLoader],       // sets up MikroORM repos in module-scoped container
  linkable: { project: { tableName: "project", primaryKey: "id" } },
})
```

### Service Factory (auto-generated CRUD)
```typescript
class ProjectModuleService extends MeridianService({ Project: ProjectModel }) {
  constructor(container: MeridianContainer) { super(container) }
  // Auto-generated: listProjects, listAndCountProjects, retrieveProject,
  //   createProject, updateProject, deleteProject, softDeleteProject
}
```

### Module Loader Pattern
```typescript
// packages/modules/project/src/loaders/default.ts
export default async function defaultLoader({ container }: LoaderOptions) {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm([ProjectSchema], config.projectConfig.databaseUrl)
  const em = orm.em.fork()
  container.register({
    projectRepository: createRepository(em, "project"),
    projectOrm: orm,
  })
}
```

### File-based API Routes
```
src/api/admin/projects/route.ts        → GET/POST /admin/projects
src/api/admin/projects/[id]/route.ts   → GET/PUT/DELETE /admin/projects/:id
```
Each file exports named HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

### Plugin Pattern
Plugins export `pluginRoot` (for auto-scanning `api/`, `subscribers/`, `jobs/`, `links/`) and optionally a default `register()` function:
```typescript
// packages/meridian/src/index.ts
export const pluginRoot = path.resolve(__dirname, "..")

export default async function register(ctx: PluginRegistrationContext): Promise<void> {
  for (const resolve of CORE_MODULES) {
    await ctx.addModule({ resolve })   // ctx.addModule() loads modules at plugin-load time
  }
}
```

### Core Modules Auto-loaded by `@meridianjs/meridian`
The `@meridianjs/meridian` plugin's `register()` automatically loads all 12 core domain modules so users **do not** list them in `meridian.config.ts`. Only optional infrastructure belongs in `modules[]`:
```typescript
// meridian.config.ts — minimal config (core modules handled by the plugin)
export default defineConfig({
  projectConfig: { databaseUrl, jwtSecret, httpPort: 9000 },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },   // swap for event-bus-redis in prod
    { resolve: "@meridianjs/job-queue-local" },   // swap for job-queue-redis in prod
    { resolve: "./src/modules/my-custom-module/index.ts" }, // user extensions
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

### Middleware Registration
```typescript
// src/api/middlewares.ts
import { authenticateJWT, requireRoles } from "@meridianjs/auth"
import { authRateLimit, apiRateLimit } from "@meridianjs/framework"
export default {
  routes: [
    { matcher: "/auth",  middlewares: [authRateLimit] },
    { matcher: "/admin", middlewares: [apiRateLimit, authenticateJWT] },
  ],
}
```

### Workflow with Compensation
```typescript
const { result, errors, transaction_status } = await createProjectWorkflow(req.scope).run({ input })
if (transaction_status === "reverted") {
  res.status(500).json({ error: { message: errors[0].message } })
  return
}
```

### RBAC Guard
```typescript
import { requireRoles } from "@meridianjs/auth"
// In a route handler:
requireRoles("admin", "super-admin")(req, res, () => { /* authorized */ })
// Or as middleware in middlewares.ts for a whole route prefix
```

### Access Control Pattern
JWT payload carries `{ id, workspaceId, roles: string[] }`. Route handlers check roles:
- `super-admin` / `admin` → see all data
- `member` → filtered by `WorkspaceMember` / `ProjectMember` records

```typescript
const roles: string[] = req.user?.roles ?? []
const isPrivileged = roles.includes("super-admin") || roles.includes("admin")
// isPrivileged ? list all : filter by membership
```

---

## Critical Rules & Known Gotchas

### 1. Container: always pass raw values
```typescript
// CORRECT
container.register({ logger, config })
// WRONG — double-wraps, resolve() returns the Resolver object, not the value
container.register({ logger: asValue(logger) })
```

### 2. Module services: always manually instantiate
The module-loader uses `new ServiceClass(moduleContainer)` — never Awilix class registration — because Awilix PROXY mode passes a proxy object, not the real `MeridianContainer`.

### 3. TypeScript: no type args on `any`-typed calls (TS2347)
```typescript
// WRONG — req is any, req.scope is any, type arg causes TS2347
const svc = req.scope.resolve<MyService>("myService")
// CORRECT
const svc = req.scope.resolve("myService") as MyService
```

### 4. tsup dual-format: exports must split types by condition
`package.json` exports **must** use nested conditions — NOT a flat `"types"` key:
```json
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
    "require": { "types": "./dist/index.d.ts",  "default": "./dist/index.js"  }
  }
}
```
A flat `"types": "./dist/index.d.ts"` causes ESM default imports to be typed as a namespace (not the actual value) — `Module.linkable` appears missing.

### 5. ESM imports require `.js` extension
```typescript
// CORRECT — even when the source file is .ts
import WorkspaceModel from "./models/workspace.js"
```

### 6. `@meridianjs/framework` is ESM-only
`"type": "module"` in its package.json, `--format esm` only in tsup. Do not add CJS output.

### 7. ORM: per-module instances
Each module creates its own `MikroORM` instance. Dev mode auto-syncs schema (`updateSchema({ safe: true })`— adds, never drops). EntityManager forked once at startup.

### 8. Subclass container access
`MeridianService` uses a private `#container` field. Always store your own reference:
```typescript
class MyService extends MeridianService({ MyModel }) {
  private readonly container: MeridianContainer
  constructor(container: MeridianContainer) {
    super(container)
    this.container = container  // required for custom methods
  }
}
```

### 9. Routes written in test-app must also be added to `@meridianjs/meridian`
Any route file created under `apps/test-app/src/api/` (except test-app-only routes like `admin/hello/`) **must** have a matching file in `packages/meridian/src/api/`. The test-app is for integration testing — scaffolded user projects get all routes from the plugin.

Before publishing `@meridianjs/meridian`, always run:
```bash
npm run check:routes
```
This script diffs test-app routes against the plugin and exits with code 1 if any are missing. It is also wired into `prepublishOnly` so `npm publish` will fail automatically if there are gaps.

### 10. All modules are npm packages
The `apps/test-app/` is **only for integration testing**. All reusable modules, plugins, and UI packages live under `packages/` and are published to npm under `@meridianjs/`. Never create local modules in `test-app/src/modules/` for features meant to ship.

---

## Build & Run Commands

```bash
# Build all packages
npx turbo run build

# Build a single package (and its deps)
npx turbo run build --filter=@meridianjs/auth

# Run test-app (requires PostgreSQL: createdb meridian_test)
node --import tsx/esm apps/test-app/src/main.ts

# Run admin dashboard (dev)
cd packages/ui/admin-dashboard && npm run dev

# Run tests
npm test
```

---

## Phase Status

### Phase 1 — Foundation ✅ COMPLETE
Express server, Awilix DI container, config loader, module loader, file-based routes, subscriber/job/link loaders, LocalEventBus.

### Phase 2 — Auth + User + Workspace ✅ COMPLETE
MikroORM integration, `@meridianjs/user`, `@meridianjs/workspace`, `@meridianjs/auth` modules, JWT authentication.

### Phase 3 — Project + Issue Modules ✅ COMPLETE
`@meridianjs/project` (Project/Label/Milestone/ProjectStatus), `@meridianjs/issue` (Issue/Comment), `@meridianjs/sprint`, `@meridianjs/activity`. Module links: project-workspace, issue-project, issue-sprint.

### Phase 4 — Workflow Engine ✅ COMPLETE
`@meridianjs/workflow-engine` — DAG runner + LIFO saga compensation. All mutation routes go through workflows (`createProjectWorkflow`, `createIssueWorkflow`, `updateIssueStatusWorkflow`, `assignIssueWorkflow`, `completeSprintWorkflow`).

### Phase 5 — Event Bus + Subscribers ✅ COMPLETE
`@meridianjs/event-bus-redis` (BullMQ), `@meridianjs/notification`. All workflows emit domain events; subscribers create notification records. Events: `project.created`, `issue.created`, `issue.status_changed`, `issue.assigned`, `sprint.completed`, `comment.created`.

### Phase 6 — Scheduler ✅ COMPLETE
`@meridianjs/job-queue-local` (dev) and `@meridianjs/job-queue-redis` (prod). File-based job loading from `src/jobs/`.

### Phase 7 — Admin UI ✅ COMPLETE
`packages/ui/admin-dashboard` — Vite + React 18, TailwindCSS, shadcn/ui, dnd-kit. Linear.app-inspired design. Features: Kanban board with custom project statuses + column reorder, issue list/detail, sprint management, workspace settings (members + teams tabs), project access control dialog, notification bell. Runs on `:9001`, proxies API to `:9000`.

Custom project statuses: `ProjectStatus` model in `@meridianjs/project`, seeded by `createProjectWorkflow`, full CRUD API at `/admin/projects/:id/statuses`. Issue.status is `text` (not enum) to support arbitrary keys.

### Phase 8 — CLI ✅ COMPLETE
`create-meridian-app` (v0.1.9). Commands: `npx create-meridian-app`, `meridian dev`, `meridian build`, `meridian db:migrate`, `meridian db:generate`. Scaffolds full project with minimal config (core modules auto-loaded by plugin).

### Phase 9 — Plugin System ✅ COMPLETE
`packages/plugin-webhook` (`@meridianjs/plugin-webhook`). Plugin loader auto-scans `api/`, `subscribers/`, `jobs/`, `links/`. `PluginRegistrationContext.addModule()` lets plugins declare required modules. `@meridianjs/meridian` uses this to auto-load all 12 core domain modules.

### Phase 10 — Production Hardening ✅ COMPLETE
Helmet (security headers), express-rate-limit, Zod validation middleware, RBAC guards (`requireRoles`), workspace isolation middleware, DB indexes via DML extension, Vitest test suite (auth middleware, validation, DML unit tests).

### Phase 11 — Code Generation + Reference Plugin + Real-time Updates (pending)
Planned:
- `meridian generate module/workflow/subscriber/job/route <name>` CLI sub-commands
- `@meridianjs/plugin-github` — reference plugin with OAuth, repo listing, issue sync, subscriber, frontend page
- SSE real-time updates — `SseManager` in framework, `GET /admin/events` stream, `useRealtimeEvents()` hook invalidates TanStack Query cache on domain events

### Phase 12 — Admin Dashboard as a Meridian Plugin (pending)
Planned: `@meridianjs/admin-dashboard` ships a `plugin/index.ts` entry that starts an Express static server for the built Vite output, managed by the framework lifecycle. `{ resolve: "@meridianjs/admin-dashboard" }` in `plugins[]` replaces the separate process. `PluginRegistrationContext` gains `onStop` teardown hook.

---

## Access Control Routes (test-app)

```
GET/POST   /admin/workspaces/:id/members            — list / add workspace member
PATCH/DELETE /admin/workspaces/:id/members/:userId  — update role / remove
GET/POST   /admin/workspaces/:id/teams              — list / create team
GET/PUT/DELETE /admin/workspaces/:id/teams/:teamId  — get / update / delete team
GET/POST   /admin/workspaces/:id/teams/:teamId/members          — list / add team member
DELETE     /admin/workspaces/:id/teams/:teamId/members/:userId  — remove
GET        /admin/projects/:id/access               — enriched member + team list
POST/DELETE /admin/projects/:id/members[/:userId]   — add / remove project member
POST/DELETE /admin/projects/:id/teams[/:teamId]     — add / remove project team
```

## Invitation Routes (test-app)

```
POST /admin/workspaces/:id/invitations   — create invite (generates token, sends link)
GET  /auth/invite/:token                 — validate token → return invite info
POST /auth/invite/:token                 — accept invite (register or login) → creates WorkspaceMember
```
