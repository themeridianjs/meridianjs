# External Integrations

**Analysis Date:** 2026-03-17

## APIs & External Services

**Email Delivery (pluggable):**
- AWS SES (`@meridianjs/email-ses`)
  - SDK: `@aws-sdk/client-ses`
  - Config: `SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EMAIL_FROM`
  - Module location: `packages/email-ses/`

- SendGrid (`@meridianjs/email-sendgrid`)
  - SDK: `@sendgrid/mail`
  - Config: `SENDGRID_API_KEY`, `EMAIL_FROM_ADDRESS`
  - Module location: `packages/email-sendgrid/`

- Resend (`@meridianjs/email-resend`)
  - SDK: `resend`
  - Config: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`
  - Module location: `packages/email-resend/`

**Authentication:**
- Google OAuth 2.0 (`@meridianjs/google-oauth`)
  - SDK: `jose` (JWT verification)
  - Config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (default: `http://localhost:9000/auth/google/callback`)
  - Frontend URL: `GOOGLE_REDIRECT_URI` callback redirects to frontend
  - Module location: `packages/google-oauth/`
  - Route: `POST /auth/google` (token exchange), `GET /auth/google/callback` (OAuth callback)

## Data Storage

**Databases:**
- PostgreSQL 12+
  - Connection: `DATABASE_URL` (environment variable)
  - Client: MikroORM 6.4.3 (`@mikro-orm/postgresql`)
  - All domain models: `@meridianjs/user`, `@meridianjs/workspace`, `@meridianjs/project`, `@meridianjs/issue`, `@meridianjs/sprint`, `@meridianjs/activity`, `@meridianjs/notification`, `@meridianjs/invitation`, `@meridianjs/workspace-member`, `@meridianjs/team-member`, `@meridianjs/project-member`, `@meridianjs/app-role`, `@meridianjs/org-calendar`

**File Storage:**
- AWS S3 or S3-compatible (`@meridianjs/storage-s3`)
  - SDK: `@aws-sdk/client-s3`
  - Config:
    - `S3_BUCKET` - Bucket name
    - `S3_REGION` (default: `eu-west-2`)
    - `AWS_S3_ACCESS_KEY_ID`
    - `AWS_S3_SECRET_ACCESS_KEY`
    - `CLOUDFRONT_URL` - Optional CloudFront distribution URL for signed URLs
    - `S3_ENDPOINT` - Optional for MinIO / LocalStack
  - Module location: `packages/storage-s3/`
  - Uploaded files served at `/uploads/*` (development) or via CloudFront (production)
  - Supports multipart file upload via Multer

**Caching & Event Queue:**
- Redis (production)
  - Client: `ioredis` 5.3.2
  - Used by: BullMQ for event bus and job scheduler
  - Connection string: Inferred from `jobQueueRedisUrl` or standard Redis connection
  - Module: `@meridianjs/event-bus-redis`, `@meridianjs/job-queue-redis`

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based (in-house)
  - Implementation: `@meridianjs/auth` module
  - Routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
  - JWT payload: `{ id, workspaceId, roles: string[] }`
  - Verification middleware: `authenticateJWT` (validates signature and expiry)
  - Secret: `JWT_SECRET` (required)
  - Token storage: HttpOnly cookies (set on login response)

- Google OAuth 2.0 (optional integration)
  - Module: `@meridianjs/google-oauth`
  - Flow: Frontend obtains Google ID token → `POST /auth/google` → backend verifies → returns app JWT
  - Requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Authorization & Roles:**
- Role-based access control: `@meridianjs/app-role`
- Roles in JWT: `roles: string[]` (e.g., `["admin", "super-admin", "member"]`)
- Guards:
  - `authenticateJWT` - Requires valid JWT
  - `requireRoles("admin", "super-admin")` - Role-based gate
  - `requirePermission("read:issues")` - Permission-based gate (via `app_role_id` on User)
- Workspace isolation: Routes check `req.user.workspaceId` for access filtering

## Monitoring & Observability

**Error Tracking:**
- Not detected - Application uses standard Express error handlers
- Logged to stderr via framework-provided middleware

**Logs:**
- Approach: `console.log` / `console.error` to stdout/stderr
- Framework lifecycle events logged via color-coded output (`packages/framework/src/colors.ts`)
- Module loader logs registered services
- Route loader logs discovered endpoints
- No external log aggregation integrated

**Application Metrics:**
- Not built-in - Observability can be added via custom middleware

## CI/CD & Deployment

**Hosting:**
- Any Node.js runtime (Vercel, Railway, Fly.io, Docker, self-hosted)
- Admin dashboard (`packages/ui/admin-dashboard/`) builds to static files via Vite
- Can be:
  - Served as separate SPA (proxy API calls to backend via CORS)
  - Bundled as Express static route via plugin system (Phase 12 planned)

**CI Pipeline:**
- Not detected - No GitHub Actions or external CI defined
- Local development: `npm run build`, `npm test`, `npm run typecheck`

**Build Process:**
- `npm run build` - Turbo orchestrates all package builds
  - `tsup` for framework packages (ESM + CJS dual format)
  - `tsc` for `@meridianjs/meridian` (ESM, source maps)
  - Vite for UI dashboard
- Outputs: `dist/` in each package
- Lockfile: `package-lock.json` committed

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWTs
- `AWS_ACCESS_KEY_ID` - AWS credentials (SES)
- `AWS_SECRET_ACCESS_KEY` - AWS credentials (SES)
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - AWS region for S3
- `AWS_S3_ACCESS_KEY_ID` - S3-specific credentials (if different from SES)
- `AWS_S3_SECRET_ACCESS_KEY` - S3-specific credentials (if different from SES)

**Optional env vars:**
- `EMAIL_FROM` - Sender email address (default: `no-reply@arjusmoon.com`)
- `CLOUDFRONT_URL` - CloudFront distribution URL for S3 signed URLs
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (default: `http://localhost:9000/auth/google/callback`)
- `SENDGRID_API_KEY` - SendGrid API key (if using SendGrid instead of SES)
- `RESEND_API_KEY` - Resend API key (if using Resend instead of SES)

**Secrets location:**
- Environment variables (`.env` file in development, platform-managed in production)
- No `.env.example` or template provided in repo
- CLAUDE.md recommends: Development uses `.env` (loaded by `tsx` via `--env-file`), production uses platform secrets

## Webhooks & Callbacks

**Incoming:**
- Webhook receiver plugin: `@meridianjs/plugin-webhook`
  - Route: `POST /webhooks/:path*` (dynamic path-based routing)
  - Purpose: Receive and route external webhooks (e.g., GitHub pushes, third-party events)
  - Verification: Plugin can validate signatures (implementation dependent)

- OAuth callback: `GET /auth/google/callback`
  - Receives `code` query param from Google
  - Exchanges code for ID token
  - Creates/logs in user

**Outgoing:**
- Not implemented - Meridian receives webhooks but doesn't send them
- Future: Webhook delivery system planned (not in current scope)

**Domain Events (internal):**
Events emitted by workflows and dispatched via event bus:
- `project.created` - New project created
- `issue.created` - New issue created
- `issue.status_changed` - Issue status updated
- `issue.assigned` - Issue assigned to user/team
- `sprint.completed` - Sprint marked complete
- `comment.created` - New comment on issue
- `workspace.created` - New workspace created
- `activity.*` - Activity/audit log entries

Subscribers listen on these events and create notifications (`@meridianjs/notification` module).

## Third-Party SDKs & Libraries

**Authentication & Crypto:**
- `jose` 5.9.6 - JOSE/JWT operations (Google OAuth token validation)

**AWS Services:**
- `@aws-sdk/client-s3` 3.0+ - S3 file storage
- `@aws-sdk/client-ses` 3.0+ - Email delivery

**Email Services:**
- `@sendgrid/mail` 8.0.0 - SendGrid SDK (pluggable alternative)
- `resend` 4.0.0 - Resend SDK (pluggable alternative)

**Message Queue & Caching:**
- `bullmq` 5.0.0 - Job queue and event bus (production)
- `ioredis` 5.3.2 - Redis client

**Database:**
- `@mikro-orm/core` 6.4.3 - ORM core
- `@mikro-orm/postgresql` 6.4.3 - PostgreSQL driver
- `@mikro-orm/migrations` 6.4.3 - Migration utilities

---

*Integration audit: 2026-03-17*
