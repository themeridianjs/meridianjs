---
id: overview
title: Core Modules
description: All 12 core modules, their packages, and auto-loading by the meridian plugin.
sidebar_position: 1
---

# Core Modules

MeridianJS ships 12 core domain modules under the `@meridianjs/` scope. They are **automatically loaded** by the `@meridianjs/meridian` plugin — you do not need to list them in `meridian.config.ts`.

---

## Module Registry

| Module key | Package | Description |
|---|---|---|
| `userModuleService` | `@meridianjs/user` | User and Team models, user management |
| `workspaceModuleService` | `@meridianjs/workspace` | Workspace model, multi-tenancy |
| `authModuleService` | `@meridianjs/auth` | JWT register/login, password hashing |
| `projectModuleService` | `@meridianjs/project` | Project, Label, Milestone, ProjectStatus |
| `issueModuleService` | `@meridianjs/issue` | Issue, Comment, activity tracking |
| `sprintModuleService` | `@meridianjs/sprint` | Sprint/Cycle lifecycle |
| `activityModuleService` | `@meridianjs/activity` | Audit log for all mutations |
| `notificationModuleService` | `@meridianjs/notification` | In-app notifications |
| `invitationModuleService` | `@meridianjs/invitation` | Workspace invitation tokens |
| `workspaceMemberModuleService` | `@meridianjs/workspace-member` | WorkspaceMember join table |
| `teamMemberModuleService` | `@meridianjs/team-member` | TeamMember join table |
| `projectMemberModuleService` | `@meridianjs/project-member` | ProjectMember and ProjectTeam |

---

## Auto-Loading via Plugin

The `@meridianjs/meridian` plugin's `register()` function calls `ctx.addModule()` for each of these 12 modules during plugin initialization. As a result, a minimal `meridian.config.ts` only needs to declare infrastructure modules:

```typescript
// meridian.config.ts — core modules are handled automatically
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    httpPort: 9000,
  },
  modules: [
    // swap these for Redis variants in production
    { resolve: '@meridianjs/event-bus-local' },
    { resolve: '@meridianjs/job-queue-local' },
  ],
  plugins: [
    { resolve: '@meridianjs/meridian' },
  ],
})
```

---

## Resolving Module Services

Any module service is available in route handlers via `req.scope.resolve()`:

```typescript
const userSvc = req.scope.resolve('userModuleService') as UserModuleService
const projectSvc = req.scope.resolve('projectModuleService') as ProjectModuleService
```

In workflow steps, use `context.container.resolve()` with the same keys.
