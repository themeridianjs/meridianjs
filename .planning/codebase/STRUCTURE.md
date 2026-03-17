# Codebase Structure

**Analysis Date:** 2026-03-17

## Directory Layout

```
meridian/
├── packages/                              # Publishable npm modules (monorepo)
│   ├── types/                             # @meridianjs/types — shared TS interfaces
│   ├── framework/                         # @meridianjs/framework — bootstrap, loaders, DI
│   ├── framework-utils/                   # @meridianjs/framework-utils — DML, Module(), defineLink(), MeridianService
│   ├── workflow-engine/                   # @meridianjs/workflow-engine — DAG runner, createWorkflow(), createStep()
│   ├── event-bus-local/                   # @meridianjs/event-bus-local — Node EventEmitter (dev)
│   ├── event-bus-redis/                   # @meridianjs/event-bus-redis — BullMQ (prod)
│   ├── job-queue-local/                   # @meridianjs/job-queue-local — in-process cron (dev)
│   ├── job-queue-redis/                   # @meridianjs/job-queue-redis — BullMQ (prod)
│   ├── modules/                           # Domain modules
│   │   ├── user/                          # @meridianjs/user — User, Team models
│   │   ├── workspace/                     # @meridianjs/workspace — Workspace model
│   │   ├── auth/                          # @meridianjs/auth — JWT, authenticateJWT, requireRoles
│   │   ├── project/                       # @meridianjs/project — Project, Label, Milestone, ProjectStatus
│   │   ├── issue/                         # @meridianjs/issue — Issue, Comment
│   │   ├── sprint/                        # @meridianjs/sprint — Sprint/Cycle
│   │   ├── activity/                      # @meridianjs/activity — Activity audit log
│   │   ├── notification/                  # @meridianjs/notification — Notification model + service
│   │   ├── invitation/                    # @meridianjs/invitation — Workspace invitation tokens
│   │   ├── workspace-member/              # @meridianjs/workspace-member — WorkspaceMember (workspace access)
│   │   ├── team-member/                   # @meridianjs/team-member — TeamMember (team membership)
│   │   ├── project-member/                # @meridianjs/project-member — ProjectMember, ProjectTeam
│   │   ├── app-role/                      # @meridianjs/app-role — AppRole, permission definitions
│   │   └── org-calendar/                  # @meridianjs/org-calendar — OrgCalendar, OrgHoliday
│   ├── meridian/                          # @meridianjs/meridian — default plugin (routes, workflows, links, subscribers)
│   ├── plugin-webhook/                    # @meridianjs/plugin-webhook — webhook receiver
│   ├── email-ses/                         # @meridianjs/email-ses — AWS SES email provider
│   ├── email-sendgrid/                    # @meridianjs/email-sendgrid — SendGrid email provider
│   ├── email-resend/                      # @meridianjs/email-resend — Resend email provider
│   ├── google-oauth/                      # @meridianjs/google-oauth — Google OAuth integration
│   ├── storage-s3/                        # @meridianjs/storage-s3 — AWS S3 file storage
│   ├── ui/
│   │   └── admin-dashboard/               # @meridianjs/admin-dashboard — React admin UI (Vite, TanStack Query, Tailwind)
│   └── create-meridian-app/               # create-meridian-app — CLI scaffolder + dev/build/generate commands
│
├── apps/
│   └── test-app/                          # Integration test app (not published)
│       ├── src/
│       │   ├── main.ts                    # Bootstrap entry point
│       │   ├── meridian.config.ts         # Project configuration
│       │   ├── api/                       # File-based routes (mirrors @meridianjs/meridian routes)
│       │   ├── subscribers/               # Event subscribers
│       │   ├── jobs/                      # Scheduled jobs
│       │   ├── links/                     # Module relationships
│       │   ├── workflows/                 # Custom workflows
│       │   ├── modules/                   # Custom local modules
│       │   └── utils/                     # Helper functions
│       └── uploads/                       # Local file upload storage
│
├── .planning/                             # GSD planning/analysis output
│   └── codebase/                          # Maps: ARCHITECTURE.md, STRUCTURE.md, etc.
├── scripts/                               # Build/test/utility scripts
├── package.json                           # Root workspace config
├── tsconfig.base.json                     # Shared TypeScript config
├── turbo.json                             # Turbo build orchestration
├── vitest.config.ts                       # Shared test config
├── CLAUDE.md                              # Developer reference (this document)
└── README.md                              # Project overview
```

## Directory Purposes

**packages/types:**
- Purpose: TypeScript interface definitions shared by all packages
- Contains: `MeridianContainer`, `ModuleDefinition`, `IEventBus`, `IScheduler`, `PluginRegistrationContext`, types for DML
- Key files: `packages/types/src/index.ts`

**packages/framework:**
- Purpose: Bootstrap orchestration, DI container, file-based route/subscriber/job/link loaders
- Contains: `bootstrap.ts` (main entry), loaders, middleware registration, HTTP server creation
- Key files: `packages/framework/src/bootstrap.ts`, `route-loader.ts`, `module-loader.ts`, `plugin-loader.ts`

**packages/framework-utils:**
- Purpose: Model definition language (DML), service factory, module definition helper, link helper
- Contains: `DML` property classes, `MeridianService` base class, `Module()`, `defineLink()`
- Key files: `packages/framework-utils/src/dml.ts`, `service-factory.ts`, `define-module.ts`, `define-link.ts`

**packages/workflow-engine:**
- Purpose: DAG-based workflow orchestration with LIFO saga compensation
- Contains: `createWorkflow()`, `createStep()`, compensation stack management, run context
- Key files: `packages/workflow-engine/src/create-workflow.ts`, `create-step.ts`

**packages/modules/{module_name}:**
- Purpose: Encapsulate a domain entity (Project, User, Issue, etc.) with model, service, and loader
- Contains: `src/models/` (DML definitions), `src/service.ts` (business logic), `src/loaders/` (DB setup), `src/index.ts` (Module export)
- Key files: `packages/modules/project/src/index.ts`, `service.ts`, `loaders/default.ts`

**packages/meridian:**
- Purpose: Default plugin bundling all core domain routes, workflows, subscribers, and links
- Contains: `src/api/` (REST routes), `src/workflows/` (transactional operations), `src/subscribers/` (event handlers), `src/links/` (entity relationships)
- Key files: `packages/meridian/src/index.ts` (plugin register function, CORE_MODULES list), routes under `src/api/`

**packages/ui/admin-dashboard:**
- Purpose: React admin interface for project management
- Contains: Vite + React 18, TanStack Query, Tailwind CSS, shadcn/ui, dnd-kit, widget system
- Key files: `src/index.tsx`, `src/pages/` (route pages), `src/components/`, `src/api/` (TanStack Query hooks)

**apps/test-app:**
- Purpose: Full integration test of Meridian framework and all core modules
- Contains: `meridian.config.ts` (configuration), `src/api/` (custom routes), modules, workflows, jobs, subscribers
- Key files: `src/main.ts` (bootstrap), `meridian.config.ts` (config), custom extensions

## Key File Locations

**Entry Points:**

- `apps/test-app/src/main.ts`: Application bootstrap; calls `bootstrap()`, sets up uploads directory, starts HTTP server
- `packages/framework/src/bootstrap.ts`: Framework initialization; loads config, creates container, orchestrates loaders, returns `MeridianApp` object
- `packages/ui/admin-dashboard/src/index.tsx`: React entry point; renders root layout, navigation, page router

**Configuration:**

- `apps/test-app/meridian.config.ts`: Project config; defines `projectConfig` (db, jwt, port), `modules[]` (infrastructure), `plugins[]` (features)
- `packages/framework/src/config-loader.ts`: Config loader; reads `meridian.config.ts` from `rootDir`, validates via Zod
- `tsconfig.base.json`: Shared TypeScript settings (paths, target, strict mode)
- `turbo.json`: Turbo build pipeline; defines build order, caching, task dependencies

**Core Logic:**

- `packages/framework/src/module-loader.ts`: Loads modules; creates child scope per module, runs loaders, instantiates service
- `packages/framework/src/route-loader.ts`: Discovers and registers routes; scans `src/api/`, converts file paths to Express routes
- `packages/framework/src/plugin-loader.ts`: Loads plugins; auto-scans `api/`, `subscribers/`, `jobs/`, `links/` directories; calls plugin `register()` function
- `packages/framework/src/subscriber-loader.ts`: Loads event subscribers; registers handlers with event bus
- `packages/framework/src/job-loader.ts`: Loads scheduled jobs; registers with scheduler (if available)
- `packages/workflow-engine/src/create-workflow.ts`: Workflow orchestration; manages step execution, compensation stack, error handling

**Testing:**

- `vitest.config.ts`: Vitest configuration shared across packages
- `packages/framework/src/validate.test.ts`: Test suite for input validation
- `packages/framework-utils/src/dml.test.ts`: Test suite for DML property definitions

**Example Routes (from packages/meridian):**

- `packages/meridian/src/api/auth/register/route.ts`: POST /auth/register — user registration
- `packages/meridian/src/api/auth/login/route.ts`: POST /auth/login — user login
- `packages/meridian/src/api/admin/projects/route.ts`: GET/POST /admin/projects — list/create projects
- `packages/meridian/src/api/admin/projects/[id]/route.ts`: GET/PUT/DELETE /admin/projects/:id — retrieve/update/delete project
- `packages/meridian/src/api/admin/issues/[id]/route.ts`: GET/PUT /admin/issues/:id — retrieve/update issue

**Example Workflows (from packages/meridian):**

- `packages/meridian/src/workflows/create-project.ts`: `createProjectWorkflow` — creates project, seeds statuses, logs activity
- `packages/meridian/src/workflows/create-issue.ts`: `createIssueWorkflow` — creates issue, assigns, logs activity
- `packages/meridian/src/workflows/update-issue-status.ts`: `updateIssueStatusWorkflow` — updates issue status, validates transitions, logs
- `packages/meridian/src/workflows/assign-issue.ts`: `assignIssueWorkflow` — assigns issue to user, creates notification

**Example Subscribers (from packages/meridian):**

- `packages/meridian/src/subscribers/on-project-created.ts`: Listens to `project.created` event, creates initial notification
- `packages/meridian/src/subscribers/on-issue-created.ts`: Listens to `issue.created` event, creates notification for assignee
- `packages/meridian/src/subscribers/on-issue-assigned.ts`: Listens to `issue.assigned` event, notifies assignee

**Example Links (from packages/meridian):**

- `packages/meridian/src/links/project-workspace.ts`: `project_workspace_link` — associates projects with workspaces
- `packages/meridian/src/links/issue-project.ts`: `issue_project_link` — associates issues with projects
- `packages/meridian/src/links/issue-sprint.ts`: `issue_sprint_link` — associates issues with sprints

## Naming Conventions

**Files:**

- Routes: `src/api/{path...}/route.ts` → `/` and `[param]` segments convert to Express parameters
- Subscribers: `src/subscribers/{event-name}.ts` → Exported handler called for events matching `config.event`
- Jobs: `src/jobs/{job-name}.ts` → Registered with scheduler under `config.name`
- Links: `src/links/{source}-{target}.ts` → Creates `{source}_{target}_link` junction table
- Models: `src/models/{entity}.ts` → Each exports a DML model definition as default
- Services: `src/service.ts` → Main service class for module (e.g., `ProjectModuleService`)
- Loaders: `src/loaders/default.ts` → Runs during bootstrap to set up module infrastructure
- Workflows: `src/workflows/{operation}.ts` → Factory function (e.g., `createProjectWorkflow`)

**Directories:**

- `api/` — REST endpoints; mirrors URL structure
- `subscribers/` — Event handlers; one file per event type (or array of types)
- `jobs/` — Scheduled tasks; one file per job
- `links/` — Module relationships; one file per link
- `models/` — Data definitions; one DML model per entity
- `loaders/` — Bootstrap setup; typically one `default.ts` per module
- `workflows/` — Transactional operations; orchestrates steps
- `modules/` — Custom local modules; same structure as domain modules

**Classes:**

- Service classes: `{Entity}ModuleService extends MeridianService({ {Entity}: {EntityModel} })`
- Plugin register functions: `export default async function register(ctx: PluginRegistrationContext)`
- Workflow constructors: `export const {operation}Workflow = createWorkflow("{operation}", async input => { ... })`

**Identifiers:**

- Workflow name: kebab-case (e.g., `create-project`, `update-issue-status`)
- Event names: dot-separated (e.g., `project.created`, `issue.assigned`, `sprint.completed`)
- Module key: camelCase with "ModuleService" suffix (e.g., `projectModuleService`, `userModuleService`)
- Repository names: camelCase with "Repository" suffix (e.g., `projectRepository`, `issueRepository`)
- Job schedule: cron string (e.g., `"0 0 * * *"`) or interval object (e.g., `{ interval: 3600000 }`)

## Where to Add New Code

**New Feature (extending existing module):**
- Add route: `src/api/admin/{resource}/route.ts` (or `[id]/` for sub-routes)
- Add workflow (if multi-step): `src/workflows/{operation}.ts`
- Add subscriber (if reacts to event): `src/subscribers/on-{event}.ts`
- Update module service: `packages/modules/{module}/src/service.ts` (add custom method)
- Update tests: `packages/modules/{module}/src/service.test.ts`

**New Module (new entity type):**
- Create directory: `packages/modules/{entity}/src/`
- Add model: `packages/modules/{entity}/src/models/{entity}.ts` (DML definition)
- Add service: `packages/modules/{entity}/src/service.ts` (extends `MeridianService`)
- Add loader: `packages/modules/{entity}/src/loaders/default.ts` (ORM setup)
- Export module: `packages/modules/{entity}/src/index.ts` (use `Module()` helper)
- Update `@meridianjs/meridian`: Add to `CORE_MODULES` array in `packages/meridian/src/index.ts`
- Add routes: Mirror routes in both `packages/meridian/src/api/` and `apps/test-app/src/api/`
- Publish: `npm version patch && npm publish` in `packages/modules/{entity}/`

**New Workflow:**
- Create file: `src/workflows/{operation}.ts`
- Use `createWorkflow()` factory with `createStep()` calls
- Export as named factory: `export const {operation}Workflow = createWorkflow(...)`
- Call from route: `{operation}Workflow(req.scope).run({ input: ... })`

**New Custom Module (local to project):**
- Create directory: `src/modules/{module}/src/`
- Follow same structure as domain modules (models, service, loader, index)
- Register in `meridian.config.ts`: `{ resolve: "./src/modules/{module}/index.ts" }`

**New Subscriber:**
- Create file: `src/subscribers/{event-name}.ts`
- Export default handler: `async (event, payload, container) => { ... }`
- Export config: `{ event: "event.name" | ["event1", "event2"] }`
- Auto-discovered during bootstrap

**New Scheduled Job:**
- Create file: `src/jobs/{job-name}.ts`
- Export default function: `async (container) => { ... }`
- Export config: `{ name: "Job Name", schedule: "0 0 * * *" | { interval: ms } }`
- Auto-discovered during bootstrap

**New Link (relationship between entities):**
- Create file: `src/links/{source}-{target}.ts`
- Define: `defineLink({ sourceModel, targetModel })`
- Creates junction table automatically
- QueryService enables: `query.findByLink("project_workspace_link", projectId, workspaceId)`

**New Route:**
- Create directory: `src/api/{path}/`
- Create file: `route.ts`
- Export HTTP methods: `export const GET = async (req, res) => { ... }`
- Access scope: `req.scope.resolve("serviceName")`
- Validation: Use Zod schema, validate in handler
- Workflow: `workflowName(req.scope).run({ input })`

## Special Directories

**node_modules/:**
- Purpose: npm package dependencies for all workspaces
- Generated: Yes (via `npm install`)
- Committed: No (in `.gitignore`)

**.turbo/:**
- Purpose: Turbo cache for build outputs
- Generated: Yes (created during `turbo run build`)
- Committed: No (in `.gitignore`)

**uploads/:**
- Purpose: Local file storage for dev (issue attachments, etc.)
- Generated: Yes (created by `main.ts` if not exists)
- Committed: No (in `.gitignore`)

**dist/:**
- Purpose: Compiled output per package (TypeScript → JavaScript)
- Generated: Yes (via `turbo run build` or `tsup`)
- Committed: No (in `.gitignore`)

**.env:**
- Purpose: Environment variables (database URL, JWT secret, API keys)
- Generated: No (user must create)
- Committed: No (in `.gitignore`) — never commit secrets
- Example: See `apps/test-app/meridian.config.ts` for required vars

**.planning/:**
- Purpose: GSD orchestrator output (codebase maps, plans, implementation logs)
- Generated: Yes (by `/gsd` commands)
- Committed: Yes (helps track analysis and planning history)

---

*Structure analysis: 2026-03-17*
