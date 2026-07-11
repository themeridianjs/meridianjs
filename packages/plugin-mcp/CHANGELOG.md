# @meridianjs/plugin-mcp

## 2.7.1

### Patch Changes

- MCP `create_task` and `update_task` accept `assignee_emails` — emails are resolved to users server-side (case-insensitive), merged and deduped with `assignee_ids`, with clear errors for unknown or deactivated users. LLM clients no longer need a `list_members` round-trip to assign by email.
  - @meridianjs/types@2.7.1
  - @meridianjs/framework@2.7.1
  - @meridianjs/auth@2.7.1
  - @meridianjs/meridian@2.7.1

## 2.7.0

### Minor Changes

- MCP server + personal access tokens: LLM clients (Claude Desktop/Code, Cursor) can now connect to Meridian.
  - New `@meridianjs/api-token` core module — personal access tokens (`mrd_` prefix, sha256-hashed at rest) with read/write scopes, optional expiry, revocation, and last-used tracking
  - New `@meridianjs/plugin-mcp` — standards-compliant MCP server (Streamable HTTP, stateless) at `/mcp` with 8 tools: create_task, update_task, get_task, search_tasks, add_comment, list_projects, list_project_statuses, list_members; write tools are hidden from read-only tokens
  - `@meridianjs/auth` — new `authenticate` middleware accepts a session JWT or a PAT on `Authorization: Bearer`; read-only PATs are limited to safe HTTP methods on REST routes
  - `@meridianjs/meridian` — api-token in CORE_MODULES, `/admin/api-tokens` management routes, and exported issue workflows + access helpers
  - Admin dashboard — Profile → API Tokens page with one-time token reveal
  - `create-meridian-app` — scaffolded projects include the MCP plugin and PAT-aware auth middleware

### Patch Changes

- Updated dependencies
  - @meridianjs/auth@2.7.0
  - @meridianjs/meridian@2.7.0
  - @meridianjs/types@2.7.0
  - @meridianjs/framework@2.7.0
