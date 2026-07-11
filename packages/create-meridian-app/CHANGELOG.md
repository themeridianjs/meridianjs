# create-meridian-app

## 2.7.2

## 2.7.1

## 2.7.0

### Minor Changes

- MCP server + personal access tokens: LLM clients (Claude Desktop/Code, Cursor) can now connect to Meridian.
  - New `@meridianjs/api-token` core module — personal access tokens (`mrd_` prefix, sha256-hashed at rest) with read/write scopes, optional expiry, revocation, and last-used tracking
  - New `@meridianjs/plugin-mcp` — standards-compliant MCP server (Streamable HTTP, stateless) at `/mcp` with 8 tools: create_task, update_task, get_task, search_tasks, add_comment, list_projects, list_project_statuses, list_members; write tools are hidden from read-only tokens
  - `@meridianjs/auth` — new `authenticate` middleware accepts a session JWT or a PAT on `Authorization: Bearer`; read-only PATs are limited to safe HTTP methods on REST routes
  - `@meridianjs/meridian` — api-token in CORE_MODULES, `/admin/api-tokens` management routes, and exported issue workflows + access helpers
  - Admin dashboard — Profile → API Tokens page with one-time token reveal
  - `create-meridian-app` — scaffolded projects include the MCP plugin and PAT-aware auth middleware

## 2.6.0

## 2.5.0

## 2.4.0

## 2.3.0

## 2.2.0

## 2.1.0

## 2.0.0

### Major Changes

- Complete rewrite of the user access flow and the user roles, and minor UI improvments and fixes

## 1.31.0

### Minor Changes

- Request to join a workspace

## 1.30.0

### Minor Changes

- UI improvements, and reporting issue fixes
- Fixed the previlaged check logic, and access control logic

## 1.29.0

## 1.28.0

### Minor Changes

- Fixed the issue create issue sidebar, added favicon

## 1.27.0

## 1.26.0

## 1.25.0

## 1.24.0

## 1.23.0

## 1.22.0

## 1.21.0

## 1.20.0

## 1.19.0

## 1.18.0

## 1.17.0

## 1.16.0

## 1.15.0

## 1.14.0

## 1.13.0

### Minor Changes

- Fixed the time log update error

## 1.12.0

## 1.11.0

## 1.10.0

## 1.9.0

## 1.8.0

## 1.7.0

## 1.6.0

## 1.5.0

## 1.4.0

### Minor Changes

- Fixed the kanban dnd issue

## 1.3.0

## 1.2.0

## 1.1.0
