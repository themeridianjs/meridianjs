# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** Modular, plugin-based architecture with dependency injection, layered service isolation, and file-based declarative routing.

**Key Characteristics:**
- Module-scoped dependency injection (Awilix PROXY mode, child containers per module)
- Convention-based file routing (`.ts` files map directly to HTTP routes)
- DAG-based workflow engine with LIFO saga compensation
- Domain-driven event-driven architecture with async subscribers
- Scheduled job scheduling via cron patterns
- Declarative module linking without database foreign keys
- Plugin system for composable features and infrastructure

## Layers

**Framework Layer:**
- Purpose: Core bootstrapping, DI setup, file scanning, middleware registration
- Location: `packages/framework/src/` — `bootstrap.ts`, loaders, server setup
- Contains: Container creation, module/plugin/route/subscriber/job loaders, HTTP server
- Depends on: Express, Awilix, MikroORM, TypeScript runtime
- Used by: All applications (via `bootstrap()` function in `apps/test-app/src/main.ts`)

**Module Layer (Infrastructure):**
- Purpose: Pluggable system infrastructure (event bus, job scheduler, email, storage, OAuth)
- Location: `packages/event-bus-*`, `packages/job-queue-*`, `packages/email-*`, `packages/google-oauth`, `packages/storage-s3`
- Contains: Service implementations, database schemas, loaders
- Depends on: Framework, Redis/BullMQ (prod), PostgreSQL, external SDKs (AWS, Google, SendGrid)
- Used by: Core domain, routes, subscribers

**Module Layer (Domain):**
- Purpose: Business logic (users, projects, issues, sprints, workflows, roles, calendars)
- Location: `packages/modules/{module_name}/` — each module is independently publishable as `@meridianjs/{module_name}`
- Contains: Data models (DML), service classes, loaders, API routes (via plugin), subscribers, links
- Depends on: Framework, MikroORM, workflow engine, event bus
- Used by: Plugins, routes, workflows

**Workflow Layer:**
- Purpose: Orchestrate multi-step transactional operations with saga compensation
- Location: `packages/workflow-engine/src/`
- Contains: DAG runner, step registration, compensation stack, context management
- Depends on: DI container, error handling
- Used by: Routes, other workflows

**Plugin Layer:**
- Purpose: Aggregate and auto-wire modules; define routes, subscribers, jobs, links declaratively
- Location: `packages/meridian/src/` (default plugin), `packages/plugin-webhook/src/` (reference)
- Contains: API routes (`src/api/`), event subscribers (`src/subscribers/`), scheduled jobs (`src/jobs/`), module links (`src/links/`)
- Depends on: Modules, framework loaders
- Used by: Bootstrap sequence (loaded from `config.plugins[]`)

**HTTP/Route Layer:**
- Purpose: Express request handling via file-based route discovery
- Location: `src/api/` in each project (plugins and apps); routes exported as named HTTP method handlers
- Contains: Request validation, error handling, workflow orchestration, response formatting
- Depends on: Express, modules, workflows, middleware
- Used by: HTTP clients

**Client Layer (UI):**
- Purpose: React admin dashboard
- Location: `packages/ui/admin-dashboard/src/`
- Contains: Vite + React 18, TanStack Query, Tailwind, shadcn/ui, widget system
- Depends on: HTTP API
- Used by: End users

## Data Flow

**Request → Response:**

1. HTTP request arrives at Express server (`:9000`)
2. Route loader's file-based router matches path: `src/api/admin/projects/[id]/route.ts` → `/admin/projects/:id`
3. Middleware chain (`src/api/middlewares.ts`): auth rate-limit → JWT validation → workspace isolation
4. Route handler receives `req` with `req.scope` (child DI container) and `req.user` (JWT payload)
5. Handler orchestrates workflow: `workflowName(req.scope).run({ input: req.body })`
6. Workflow executor (`WorkflowRunner`) creates isolated run context with compensation stack
7. Workflow steps execute sequentially, each can register compensation for rollback
8. On success: return result with `transaction_status: "done"`
9. On error: execute compensation stack in LIFO order, return `transaction_status: "reverted"`
10. Route handler formats response (JSON) and sends to client
11. Subscriber workers (event bus) listen for domain events emitted during workflow
12. Scheduled jobs (scheduler) run at configured cron intervals

**State Management:**

- **Global Container**: Holds config, logger, eventBus, scheduler, Express server
- **Module Container**: Child scope per module, holds module-specific services and repositories
- **Request Container**: `req.scope` — further child scope for per-request isolation
- **Workflow Context**: AsyncLocal storage (`workflowRunContext`) for compensation stack and access to request scope
- **Event Bus**: Pub/sub via EventEmitter (dev) or BullMQ (prod); subscribers notified after workflow commits
- **Database**: Per-module MikroORM instance (ORM) with forked EntityManager at startup

## Key Abstractions

**Module:**
- Purpose: Self-contained domain unit with models, service, loader, optional routes/subscribers/jobs
- Examples: `packages/modules/project/`, `packages/modules/issue/`, `packages/modules/auth/`
- Pattern: Module definition (`Module("key", { service, models, loaders, linkable })`) exported from `index.ts`; auto-discovered by plugin loader or manually declared in `config.modules[]`
- Auto-generated CRUD: `MeridianService` subclass generates `listXxx`, `retrieveXxx`, `createXxx`, `updateXxx`, `deleteXxx` methods

**Link:**
- Purpose: Join-table relationship between two entities without database foreign key coupling
- Examples: `project-workspace` link, `issue-project` link, `issue-sprint` link
- Pattern: Defined in `src/links/{source}-{target}.ts` using `defineLink()`; creates `{source}_{target}_link` junction table
- Querying: `Query` service provides graph traversal (e.g., find all projects in a workspace)

**Workflow:**
- Purpose: Transactional, compensatable multi-step operation
- Examples: `createProjectWorkflow`, `updateIssueStatusWorkflow`, `createInvitationWorkflow`
- Pattern: Steps registered via `createStep()`, returns promise or `WorkflowResponse(output)`. Steps can register compensation via `registerCompensation()`. Workflow factory: `createWorkflow("name", async input => { /* step orchestration */ })`
- Failure handling: On any step error, compensation stack executes in LIFO order

**Plugin:**
- Purpose: Composable feature or infrastructure provider
- Examples: `@meridianjs/meridian` (default plugin, loads all core modules), `@meridianjs/plugin-webhook` (webhook receiver), `@meridianjs/storage-s3` (S3 backend)
- Pattern: NPM package with `pluginRoot` export (points to `/dist` or `/src`), optional `register()` function. Auto-scans `api/`, `subscribers/`, `jobs/`, `links/` directories. Can call `ctx.addModule()` to declare required modules
- Registry: Listed in `meridian.config.ts` under `plugins[]`

**Service:**
- Purpose: Encapsulate business logic and data access
- Examples: `ProjectModuleService extends MeridianService({ Project, Label })`
- Pattern: Constructor receives `container: MeridianContainer`, stores reference for accessing repositories and other services. Auto-generated CRUD methods via `MeridianService` base class factory
- Repositories: Resolved from container (`container.resolve("projectRepository")`)

**Model (DML):**
- Purpose: Define data structure (fields, types, constraints) in a runtime-computable way
- Examples: `ProjectModel = model.define("project", { id: model.id().primaryKey(), name: model.text(), ... })`
- Pattern: Fluent API (`model.id()`, `model.text()`, `model.enum([...])`, etc.) with chainable property options (`.nullable()`, `.default()`, `.primaryKey()`)
- Compilation: `dmlToEntitySchema(Model)` → MikroORM entity schema at loader time

**Event:**
- Purpose: Notification of domain state changes
- Examples: `project.created`, `issue.assigned`, `issue.status_changed`, `sprint.completed`
- Pattern: Emitted by workflows via `eventBus.emit(eventName, { entity_type, entity_id, ... })`. Subscribers listen in `src/subscribers/{name}.ts`, export `default` handler and `config: { event: "name" }` (can be array)
- Subscriber receives: `{ event, payload, container }` — can call services to perform side effects (notifications, analytics, etc.)

**Scheduled Job:**
- Purpose: Periodic background task
- Examples: `send-notification-digest`, `cleanup-old-activities`, `create-recurring-issues`
- Pattern: File in `src/jobs/{name}.ts`, exports `default: async (container) => { ... }` and `config: { name, schedule: "0 0 * * *" | { interval: ms } }`
- Execution: Registered with scheduler module; runs at configured time, receives container for service resolution

## Entry Points

**HTTP Server:**
- Location: `packages/framework/src/server.ts`
- Triggers: `app.start()` called after bootstrap completes in `apps/test-app/src/main.ts`
- Responsibilities: Create Express app, register health check (`GET /health`), apply Helmet security headers, error handler middleware

**Bootstrap:**
- Location: `packages/framework/src/bootstrap.ts`
- Triggers: Awaited in `main.ts` before `app.start()`
- Responsibilities: Load config, create global container, register core primitives, load modules/plugins in order, set up loaders for routes/subscribers/jobs/links

**Module Loaders:**
- Location: Module `src/loaders/default.ts`
- Triggers: Called during `bootstrap()` step 4 (loadModules)
- Responsibilities: Create module-scoped ORM, fork EntityManager, register repositories and services in module container

**Plugin Register Function:**
- Location: Plugin's default export `register(ctx: PluginRegistrationContext)`
- Triggers: Called during `bootstrap()` step 7 (loadPlugins)
- Responsibilities: Call `ctx.addModule()` to declare required modules, register custom services in container, set up plugin-specific initialization

**Route Files:**
- Location: `src/api/**\/route.ts`
- Triggers: Discovered and loaded during `bootstrap()` step 9 (loadRoutes)
- Responsibilities: Handle HTTP request, validate input, call workflows/services, return JSON response

**Middleware Configuration:**
- Location: `src/api/middlewares.ts`
- Triggers: Loaded during `bootstrap()` step 6, before plugins
- Responsibilities: Declare route matchers and middleware chains (auth, rate-limit, authorization)

**Subscribers:**
- Location: `src/subscribers/*.ts`
- Triggers: Loaded during `bootstrap()` step 10, after routes; subscribe to eventBus
- Responsibilities: Listen for domain events, perform side effects (notifications, audit logs, webhooks)

**Scheduled Jobs:**
- Location: `src/jobs/*.ts`
- Triggers: Loaded during `bootstrap()` step 11, registers with scheduler
- Responsibilities: Execute at configured schedule, perform background work (cleanup, digests, recurring task creation)

**Links:**
- Location: `src/links/*.ts`
- Triggers: Loaded during `bootstrap()` step 8, before routes
- Responsibilities: Define relationships between entities; LinkService and QueryService registered in global container

## Error Handling

**Strategy:** Synchronous validation at request entry; async compensation for transactional failures.

**Patterns:**

- **Input Validation**: Zod schema validation in route handlers (before workflow execution) — return 400 with error details
- **Workflow Compensation**: Step fails → remaining steps skipped, compensation stack executes LIFO → workflow returns `transaction_status: "reverted"` with error list
- **Permission Errors**: `requirePermission()` middleware throws 403 before reaching handler
- **Not Found**: Service method returns `null` → route returns 404
- **Database Errors**: MikroORM throws → caught by error handler middleware → logged and 500 returned
- **Async Task Errors**: Subscriber or job catches error locally (doesn't re-throw) → error logged to console/monitoring
- **Rate Limit**: `authRateLimit` or `apiRateLimit` middleware returns 429 Too Many Requests

## Cross-Cutting Concerns

**Logging:** `ConsoleLogger` injected into container, available to all services via `container.resolve<ILogger>("logger")`; framework logs bootstrap steps, route registration, module loading; services call `logger.info/warn/error/debug()`

**Validation:** Zod schemas used for request body validation in route handlers; `validateSchema(data, schema)` middleware for automatic validation with 400 response

**Authentication:** JWT verification via `authenticateJWT` middleware; payload decoded into `req.user: { id, workspaceId, roles, permissions }`. Routes access via `req.user.id`, `req.user.roles`

**Authorization:** Role-based access control via `requireRoles("admin", "member")` middleware; permission-based via `requirePermission("project:read")` middleware. Both check `req.user.roles` and `req.user.permissions` arrays

**Workspace Isolation:** `requireWorkspace` middleware ensures `req.user.workspaceId` is set; most service queries filter by `workspace_id` implicitly

**Caching:** No built-in cache layer; admin UI uses TanStack Query client-side caching; backend relies on database query optimization

**Request Logging:** `httpLogger` middleware logs all requests (method, path, status, duration); debug logs available with `DEBUG=meridian:*`

---

*Architecture analysis: 2026-03-17*
