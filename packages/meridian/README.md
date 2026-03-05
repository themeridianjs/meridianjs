# @meridianjs/meridian

The default MeridianJS plugin. Provides all core domain modules, API routes, workflows, event subscribers, and link definitions out of the box. Adding this single plugin to your config gives you a fully functional project management backend.

## Installation

```bash
npm install @meridianjs/meridian
```

## Configuration

```typescript
// meridian.config.ts
import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret:   process.env.JWT_SECRET!,
    httpPort:    9000,
  },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },   // swap for event-bus-redis in production
    { resolve: "@meridianjs/job-queue-local" },   // swap for job-queue-redis in production
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

You do **not** need to list the 14 core domain modules individually — the plugin loads them all automatically.

## What's Included

### Core Domain Modules (auto-loaded)

| Module | Service Token | Description |
|---|---|---|
| `@meridianjs/user` | `userModuleService` | Users, teams, sessions |
| `@meridianjs/workspace` | `workspaceModuleService` | Multi-tenant workspaces |
| `@meridianjs/auth` | `authModuleService` | JWT register / login / OAuth |
| `@meridianjs/project` | `projectModuleService` | Projects, labels, milestones, statuses |
| `@meridianjs/issue` | `issueModuleService` | Issues, comments, attachments, time logs |
| `@meridianjs/sprint` | `sprintModuleService` | Sprints / cycles |
| `@meridianjs/activity` | `activityModuleService` | Audit log |
| `@meridianjs/notification` | `notificationModuleService` | In-app notifications |
| `@meridianjs/invitation` | `invitationModuleService` | Workspace invitation tokens |
| `@meridianjs/workspace-member` | `workspaceMemberModuleService` | Workspace membership + roles |
| `@meridianjs/team-member` | `teamMemberModuleService` | Team membership |
| `@meridianjs/project-member` | `projectMemberModuleService` | Project-level access control |
| `@meridianjs/app-role` | `appRoleModuleService` | Custom RBAC roles with permission arrays |
| `@meridianjs/org-calendar` | `orgCalendarModuleService` | Working days, holidays, Gantt support |

### API Routes

All routes are mounted automatically. Selected highlights:

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account, return JWT |
| `POST` | `/auth/login` | Authenticate, return JWT |
| `GET/POST` | `/admin/workspaces` | List / create workspaces |
| `GET/POST` | `/admin/projects` | List / create projects |
| `GET/POST` | `/admin/projects/:id/issues` | List / create issues |
| `GET/POST` | `/admin/projects/:id/sprints` | Manage sprints |
| `POST` | `/admin/projects/:id/issues/:issueId/comments` | Add comment |
| `GET/POST` | `/admin/workspaces/:id/members` | Workspace membership |
| `GET/POST` | `/admin/workspaces/:id/teams` | Team management |
| `GET/POST` | `/admin/workspaces/:id/invitations` | Invite users |
| `GET/POST` | `/admin/roles` | Custom RBAC role management |

### Workflows

All mutation routes run through saga workflows with automatic compensation:

- `createProjectWorkflow` — creates project + seeds default statuses
- `createIssueWorkflow` — creates issue + records activity + emits event
- `updateIssueStatusWorkflow` — updates status + emits `issue.status_changed`
- `assignIssueWorkflow` — assigns user + emits `issue.assigned`
- `completeSprintWorkflow` — completes sprint + moves incomplete issues to backlog

### Domain Events

| Event | Emitted by |
|---|---|
| `project.created` | `createProjectWorkflow` |
| `issue.created` | `createIssueWorkflow` |
| `issue.status_changed` | `updateIssueStatusWorkflow` |
| `issue.assigned` | `assignIssueWorkflow` |
| `sprint.completed` | `completeSprintWorkflow` |
| `comment.created` | Comment creation route |

## Extending

Disable specific subscribers if you want to handle events yourself:

```typescript
{ resolve: "@meridianjs/meridian", disableSubscribers: ["issue.created"] }
```

Add your own routes, subscribers, and jobs alongside the plugin by placing files in your project's `src/api/`, `src/subscribers/`, and `src/jobs/` directories.

## License

MIT
