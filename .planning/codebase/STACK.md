# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- TypeScript 5.7.2 - All backend packages and CLI. Full strict mode enabled.
- JavaScript (ES2022) - Build outputs (tsup/tsc)

**Secondary:**
- HTML/CSS/React JSX - Admin dashboard UI (`packages/ui/admin-dashboard/`)

## Runtime

**Environment:**
- Node.js 20+ (ESM-first, requires `"type": "module"` in package.json)
- npm 10.9.2+

**Package Manager:**
- npm workspaces (monorepo)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express.js 4.21.2 - HTTP server and middleware routing
- Awilix 12.0.5 - Dependency injection container (PROXY mode for child scoping per module)

**Database:**
- MikroORM 6.4.3 - ORM for schema definition and querying
  - `@mikro-orm/core` 6.4.3 - Core ORM functionality
  - `@mikro-orm/postgresql` 6.4.3 - PostgreSQL driver
  - `@mikro-orm/migrations` 6.4.3 - Migration support (dev mode only uses schema sync)

**Event Bus:**
- BullMQ 5.0.0 - Job queue and event bus (production)
- Node.js EventEmitter - Local event bus (development)

**Scheduler:**
- BullMQ 5.0.0 - Cron and interval jobs (production)
- In-process scheduler - Local scheduler (development)

**Web UI:**
- React 18.3.1 - Component library
- Vite 5.4.11 - Build tool and dev server for dashboard
- TanStack Query (React Query) 5.62.0 - Server state management
- TailwindCSS 3.4.17 - Utility-first CSS
- shadcn/ui (via Radix UI) - Headless component library
  - `@radix-ui/` components (dialog, dropdown, select, tooltip, etc.)
- dnd-kit 6.3.1 - Drag-and-drop for Kanban board and status reordering
- Recharts 3.7.0 - Charts and visualizations
- React Router 6.28.0 - Client-side routing
- Tiptap 3.20.0 - Rich text editor with mentions and task lists
- next-themes 0.4.4 - Light/dark mode support
- Jotai 2.18.0 - Lightweight state management
- Sonner 1.7.1 - Toast notifications
- Lucide React 0.468.0 - Icon library

**CLI:**
- Commander.js 12.1.0 - Command-line argument parsing
- Chalk 5.3.0 - Terminal color output
- Ora 8.1.1 - Loading spinners
- Prompts 2.4.2 - Interactive prompts
- Execa 9.5.2 - Child process execution
- esbuild 0.25.0 - Bundle compilation for custom modules

**Validation:**
- Zod 3.24.0 - Schema validation and request body parsing

**Testing:**
- Vitest 2.1.8 - Test runner and framework (Node environment, globals enabled)
- V8 coverage provider - Code coverage reporting

**Build/Dev:**
- Turbo 2.3.3 - Monorepo task orchestration
- tsup 8.3.5 - TypeScript bundler (dual ESM/CJS format support)
- TypeScript 5.7.2 - Type checking and compilation
- tsx 4.21.0 - TypeScript execution (dev mode only)

**Authentication & Security:**
- jose 5.9.6 - JWT parsing and JOSE operations (Google OAuth)
- jsonwebtoken (implicit via middleware) - JWT handling
- Helmet 8.0.0 - Security headers (Express middleware)
- express-rate-limit 7.5.0 - Rate limiting middleware

**File Upload & Serving:**
- Multer 1.4.5-lts.1 - File upload handling

**Storage:**
- AWS SDK v3 S3 (`@aws-sdk/client-s3` 3.0+) - S3-compatible object storage
- ioredis 5.3.2 - Redis client (event bus and scheduler backend)

**Email:**
- SendGrid API (`@sendgrid/mail` 8.0.0) - Email service provider
- Resend SDK (`resend` 4.0.0) - Alternative email provider
- AWS SES SDK (`@aws-sdk/client-ses` 3.0.0) - Alternative email provider

**Utilities:**
- DOMPurify 3.3.1 - HTML sanitization
- ExcelJS 4.4.0 - Excel file generation
- canvas-confetti 1.9.4 - Celebration animations
- lodash.throttle 4.1.1 - Throttling utility
- date-fns 4.1.0 - Date manipulation

## Key Dependencies

**Critical Infrastructure:**
- Express.js - All HTTP routing, middleware execution, server lifecycle
- Awilix - Module isolation via DI scoping; enables multi-tenant architecture
- MikroORM - All database schema, queries, and migrations
- BullMQ - Event bus and job scheduling in production (swappable for local dev)
- PostgreSQL - Primary database (configured via `DATABASE_URL`)

**Core Framework Packages:**
- `@meridianjs/framework` - Bootstrap, container setup, route/subscriber/job/link loaders
- `@meridianjs/framework-utils` - DML (Domain Modeling Language), service factory, module definition helpers
- `@meridianjs/types` - Shared TypeScript interfaces for all modules

**Domain Modules:**
- `@meridianjs/user` - User, Team, UserSession models
- `@meridianjs/workspace` - Workspace model (multi-tenant)
- `@meridianjs/auth` - JWT auth, register/login/logout flows
- `@meridianjs/project` - Project, Label, Milestone, ProjectStatus models
- `@meridianjs/issue` - Issue, Comment models
- `@meridianjs/sprint` - Sprint/Cycle model
- `@meridianjs/activity` - Activity audit log model
- `@meridianjs/notification` - Notification model and service
- `@meridianjs/invitation` - Invitation token management
- `@meridianjs/workspace-member` - WorkspaceMember access control model
- `@meridianjs/team-member` - TeamMember model
- `@meridianjs/project-member` - ProjectMember and ProjectTeam access control
- `@meridianjs/app-role` - Application role-based access control
- `@meridianjs/org-calendar` - Organization calendar and holidays

**Workflow & Automation:**
- `@meridianjs/workflow-engine` - DAG runner with LIFO saga compensation

**Default Plugin:**
- `@meridianjs/meridian` - Auto-loads all core domain modules, provides standard routes/workflows/links/subscribers

**Optional Plugins:**
- `@meridianjs/plugin-webhook` - Webhook receiver and router

**UI:**
- `@meridianjs/admin-dashboard` - React-based admin/dashboard SPA

**CLI:**
- `create-meridian-app` - NPX scaffolder and Meridian CLI (dev/build/db commands)

## Configuration

**Environment:**
- Configuration via `meridian.config.ts` at project root (TypeScript, loaded at startup)
- Primary config entries:
  - `projectConfig.databaseUrl` - PostgreSQL connection string
  - `projectConfig.jwtSecret` - JWT signing secret
  - `projectConfig.httpPort` - HTTP server port (default 9000)
  - `projectConfig.maxChildIssueDepth` - Hierarchy depth limit
  - `projectConfig.registration` - User registration settings
  - `admin` - Admin dashboard branding (appName, logoUrl)
  - `modules[]` - List of modules/plugins to load (core modules auto-loaded by `@meridianjs/meridian`)
  - `plugins[]` - List of plugins to register

**Module Options Pattern:**
```typescript
{
  resolve: "@meridianjs/email-ses",
  options: {
    fromAddress: process.env.EMAIL_FROM,
    region: process.env.SES_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
}
```

**Build:**
- `tsconfig.base.json` - Base TypeScript config (target: ES2022, module: NodeNext)
- Individual `tsconfig.json` files in each package extend base config
- Turbo caching configured in `turbo.json` with input/output patterns
- Build outputs: ESM (`.mjs`, `.d.mts`) and CJS (`.js`, `.d.ts`) for broad compatibility

**Database Configuration:**
- Per-module MikroORM instances created via `createModuleOrm(schemas, databaseUrl)`
- EntityManager forked once at startup: `orm.em.fork()`
- Dev mode: Auto-sync schema with `updateSchema({ safe: true })` (adds only, never drops)
- Schema defined via DML in model classes (`dmlToEntitySchema()` converts to ORM format)

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- PostgreSQL 12+ (running locally or via connection string)
- Redis (optional, needed for production-like local testing)

**Production:**
- Node.js 20+ (ESM runtime)
- PostgreSQL database
- Redis instance (for BullMQ event bus and job queue)
- AWS account (for S3 storage, SES email, or use MinIO for S3-compatible alternative)
- Email provider setup (SendGrid, Resend, AWS SES, or custom)

**Hosting:**
- Any Node.js-compatible platform (Vercel, Railway, Fly.io, Docker, self-hosted)
- Admin dashboard can be deployed as separate static files or bundled with server via `@meridianjs/admin-dashboard` plugin

---

*Stack analysis: 2026-03-17*
