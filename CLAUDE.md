# Meridian — Developer Reference

Open-source project management framework (Asana/Jira-equivalent), Medusa.js-inspired, NPX-installable. Full plan: `/Users/arjusmoon/.claude/plans/mellow-sprouting-parrot.md`

---

## Monorepo Structure

```
meridian/
├── packages/
│   ├── types/                 @meridianjs/types            — all shared TS interfaces
│   ├── framework-utils/       @meridianjs/framework-utils  — DML, MeridianService, Module(), defineLink()
│   ├── framework/             @meridianjs/framework        — bootstrap, DI, loaders, Express server
│   ├── event-bus-local/       @meridianjs/event-bus-local  — Node EventEmitter IEventBus (dev)
│   ├── workflow-engine/       @meridianjs/workflow-engine  — DAG runner, createStep/createWorkflow, LIFO compensation
│   └── modules/
│       ├── user/              @meridianjs/user             — User, Team models
│       ├── workspace/         @meridianjs/workspace        — Workspace model (multi-tenant)
│       ├── auth/              @meridianjs/auth             — JWT register/login, authenticateJWT middleware
│       ├── project/           @meridianjs/project          — Project, Label, Milestone
│       ├── issue/             @meridianjs/issue            — Issue, Comment
│       ├── sprint/            @meridianjs/sprint           — Sprint/Cycle
│       └── activity/          @meridianjs/activity         — Activity audit log
└── apps/
    └── test-app/              @meridianjs/test-app         — integration test app
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
| Events (dev) | Node.js EventEmitter |
| Events (prod) | BullMQ + Redis (Phase 5) |
| Scheduler | BullMQ cron (Phase 6) |
| UI | React 18 + Vite + TanStack Query + Tailwind (Phase 7) |
| CLI | Commander.js (Phase 8) |

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

### Middleware Registration
```typescript
// src/api/middlewares.ts
import { authenticateJWT } from "@meridianjs/auth"
export default {
  routes: [
    { matcher: "/admin", middlewares: [authenticateJWT] },
  ],
}
```

### User Config
```typescript
// meridian.config.ts
export default defineConfig({
  projectConfig: { databaseUrl, jwtSecret, httpPort: 9000 },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/user" },
    { resolve: "@meridianjs/workspace" },
    { resolve: "@meridianjs/auth" },
    { resolve: "./src/modules/my-custom-module/index.ts" }, // local module
  ],
})
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
// CORRECT — or cast scope first
const svc = (req.scope as MeridianContainer).resolve<MyService>("myService")
```

### 4. tsup dual-format: exports must split types by condition
Without `"type": "module"` in package.json, tsup outputs:
- CJS → `dist/index.js` + `dist/index.d.ts`
- ESM → `dist/index.mjs` + `dist/index.d.mts`

`package.json` exports **must** use nested conditions — NOT a flat `"types"` key — so TypeScript ESM imports get `.d.mts` (ESM declarations) and CJS requires get `.d.ts`:

```json
"exports": {
  ".": {
    "import": {
      "types": "./dist/index.d.mts",
      "default": "./dist/index.mjs"
    },
    "require": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

With a flat `"types": "./dist/index.d.ts"`, TypeScript treats all imports as CJS. This causes two bugs:
1. ESM default imports are typed as `typeof import(...)` (namespace) instead of the actual default value — so `Module.linkable` appears missing
2. CJS `require()` can't find `dist/index.cjs` (which doesn't exist)

### 5. ESM imports require `.js` extension
```typescript
// CORRECT — even when the source file is .ts
import WorkspaceModel from "./models/workspace.js"
import defaultLoader from "./loaders/default.js"
```

### 6. `@meridianjs/framework` is ESM-only
Its `package.json` has `"type": "module"` and tsup uses `--format esm` only. Do not add CJS output.

### 7. ORM: per-module instances
Each module creates its own `MikroORM` instance in its loader. In development, `updateSchema({ safe: true })` auto-syncs the schema (adds columns/tables, never drops). EntityManager is forked once at startup — per-request forking is planned for Phase 3.

### 8. Subclass container access
`MeridianService` uses a private `#container` field (not accessible in subclasses). Always store your own reference:
```typescript
class MyService extends MeridianService({ MyModel }) {
  private readonly container: MeridianContainer
  constructor(container: MeridianContainer) {
    super(container)
    this.container = container  // required for custom methods
  }
}
```

---

## Build & Run Commands

```bash
# Build all packages
npx turbo run build

# Build a single package (and its deps)
npx turbo run build --filter=@meridianjs/auth

# Run test-app (requires PostgreSQL)
npm run dev -w apps/test-app

# Run from project root
node --import tsx/esm apps/test-app/src/main.ts
```

---

## Phase Status

### Phase 1 — Foundation ✅ COMPLETE
Express server, Awilix DI container, config loader, module loader, file-based routes, subscriber/job/link loaders, LocalEventBus.

Verified:
```
GET  /health  → { ok: true }
GET  /admin/hello?name=Developer  → { greeting: "Hello, Developer! ..." }
POST /admin/hello  → { module: "HelloModule", status: "active" }
```

### Phase 2 — Auth + User + Workspace ✅ COMPLETE
MikroORM integration, `@meridianjs/user`, `@meridianjs/workspace`, `@meridianjs/auth` modules, JWT authentication.

Requires: PostgreSQL running, `meridian_test` database created (`createdb meridian_test`).

Test-app routes:
```
POST /auth/register         → { user, token }
POST /auth/login            → { user, token }
GET  /admin/users           → 401 without Bearer token; { users, count } with valid token
GET  /admin/workspaces      → 401 without Bearer token; { workspaces, count } with valid token
POST /admin/workspaces      → 401 without Bearer token; { workspace } with valid token
```

Verification:
```bash
# Register
curl -X POST http://localhost:9000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login → get token
curl -X POST http://localhost:9000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Protected (replace <token>)
curl http://localhost:9000/admin/users -H "Authorization: Bearer <token>"
```

### Phase 3 — Project + Issue Modules ✅ COMPLETE
`@meridianjs/project` (Project/Label/Milestone), `@meridianjs/issue` (Issue/Comment), `@meridianjs/sprint`, `@meridianjs/activity`. 3 module links registered. Full CRUD routes with activity logging.

DML enhanced: `.default()` added to TextProperty, EnumProperty, NumberProperty.

Test-app routes:
```
GET/POST   /admin/projects                 → list / create project (auto-generates identifier e.g. "MYPR")
GET/PUT/DELETE /admin/projects/:id         → get / update / delete project
GET/POST   /admin/issues                   → list / create issue (auto-generates PROJ-1 identifier)
GET/PUT/DELETE /admin/issues/:id           → get / update / delete issue (logs activity)
GET/POST   /admin/issues/:id/comments      → list / add comment
GET/POST   /admin/sprints                  → list / create sprint
GET/PUT/DELETE /admin/sprints/:id          → get / update / delete sprint
```

Module links (src/links/): project-workspace, issue-project, issue-sprint.

Link files import the module default and reference `.linkable!.table`:
```typescript
import { defineLink } from "@meridianjs/framework-utils"
import WorkspaceModule from "@meridianjs/workspace"
import ProjectModule from "@meridianjs/project"

export default defineLink(
  WorkspaceModule.linkable!.workspace,
  { linkable: ProjectModule.linkable!.project, isList: true }
)
```
This requires the `exports` field to use nested type conditions (see Critical Rule #4).

### Phase 4 — Workflow Engine ✅ COMPLETE
`@meridianjs/workflow-engine` package with DAG runner + LIFO saga compensation.

Core API:
- `createStep(name, invoke, compensate?)` — step factory; compensation runs on rollback
- `StepResponse(output, compensateInput)` — decouple step output from compensation input
- `createWorkflow(name, constructorFn)` — returns factory `(container) => { run({ input }) }`
- `WorkflowResponse(output)` — workflow constructor return value
- `transform(value, fn)` / `when(condition, fn)` — utilities

Uses `AsyncLocalStorage` to carry the container + compensation stack across eager step calls — no global state, safe for concurrent requests.

Workflows in `apps/test-app/src/workflows/`:
- `createProjectWorkflow` — validates identifier → creates project → logs activity (compensates: deletes project)
- `createIssueWorkflow` — creates issue → logs activity (compensates: deletes issue)
- `updateIssueStatusWorkflow` — fetches issue → sets status → logs activity (compensates: restores previous status)
- `assignIssueWorkflow` — fetches issue → sets assignee → logs activity (compensates: restores previous assignee)
- `completeSprintWorkflow` — validates sprint is active → marks completed → (optionally moves issues) → logs activity (compensates: restores previous status)

All mutation routes now call workflows instead of services directly:
- `POST /admin/projects` → `createProjectWorkflow`
- `POST /admin/issues` → `createIssueWorkflow`
- `PUT /admin/issues/:id` (status change) → `updateIssueStatusWorkflow`
- `PUT /admin/issues/:id` (assignee change) → `assignIssueWorkflow`
- `PUT /admin/sprints/:id` (status=completed) → `completeSprintWorkflow`

Rollback example:
```typescript
const { result, errors, transaction_status } = await createProjectWorkflow(req.scope).run({ input })
if (transaction_status === "reverted") {
  res.status(500).json({ error: { message: errors[0].message } })
  return
}
```

### Phase 5 — Event Bus + Subscribers ✅ COMPLETE
`@meridianjs/event-bus-redis` (BullMQ + ioredis) and `@meridianjs/notification` module. All workflows emit domain events; subscribers create notification records asynchronously.

New packages:
- `@meridianjs/event-bus-redis` — BullMQ queue `meridian:events`; Worker fans out to handlers by event name. 3 retries with exponential backoff. Switch from LocalEventBus by changing one line in `meridian.config.ts`.
- `@meridianjs/notification` — Notification model + service with `createNotification`, `listNotificationsForUser`, `markAsRead`, `markAllAsRead`.

Shared step `src/workflows/emit-event.ts` — `emitEventStep` resolves eventBus from container. No compensation (fire-and-forget).

Events emitted (final step of each workflow):
`project.created`, `issue.created`, `issue.status_changed`, `issue.assigned`, `sprint.completed`, `comment.created`

Subscribers: `issue-created.ts` (notifies assignee+reporter), `issue-assigned.ts` (notifies new assignee), `comment-created.ts` (notifies assignee+reporter)

Notification routes:
- `GET /admin/notifications` — list for current user (`?unread=true`)
- `POST /admin/notifications/:id/read` — mark single as read
- `POST /admin/notifications/read-all` — mark all as read

### Phase 6 — Scheduler (pending)
Planned: `@meridianjs/job-queue-redis` (BullMQ cron), `src/jobs/` file-based job loading.

### Phase 7 — Admin UI (pending)
Planned: `@meridianjs/ui-design-system` (Radix + Tailwind), `@meridianjs/admin-dashboard` (Vite + React + TanStack Query), Kanban board, sprint planning.

### Phase 8 — CLI (`create-meridian-app`) (pending)
Planned: `npx create-meridian-app my-project`, `meridian dev/build/db:migrate/generate`.

### Phase 9 — Plugin System (pending)
Planned: npm packages contributing modules, routes, subscribers, jobs, UI widgets.

### Phase 10 — Production Hardening (pending)
Planned: RBAC, rate limiting, RLS, OpenAPI, OpenTelemetry, comprehensive test suite.
