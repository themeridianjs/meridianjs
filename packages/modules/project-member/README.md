# @meridianjs/project-member

Project access control module for MeridianJS. Manages which users and teams have access to individual projects, enabling fine-grained, project-level permissions on top of workspace membership.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Overview

Access to a project is determined by two tables:

- **`ProjectMember`** — a direct user ↔ project grant
- **`ProjectTeam`** — a team ↔ project grant (all team members inherit access)

`admin` and `super-admin` roles bypass both checks and see all projects.

## Service: `projectMemberModuleService`

```typescript
const svc = req.scope.resolve("projectMemberModuleService") as any
```

### Methods

```typescript
// Get all project IDs accessible to a user (direct + via teams)
const projectIds = await svc.getAccessibleProjectIds(userId, userTeamIds)

// List all direct members of a project
const members = await svc.listProjectMembers(projectId)
// → [{ id, user_id, role }]

// List all teams with access to a project
const teams = await svc.listProjectTeamIds(projectId)
// → [{ id, team_id }]

// Standard CRUD
await svc.createProjectMember({ project_id, user_id, role })
await svc.deleteProjectMember(id)
await svc.createProjectTeam({ project_id, team_id })
await svc.deleteProjectTeam(id)
```

### Access Filtering in Route Handlers

```typescript
const roles     = req.user?.roles ?? []
const isPrivileged = roles.includes("admin") || roles.includes("super-admin")

if (isPrivileged) {
  const projects = await projectSvc.listProjectsByWorkspace(workspaceId)
} else {
  const teamIds    = await teamMemberSvc.getUserTeamIds(req.user.id)
  const projectIds = await projectMemberSvc.getAccessibleProjectIds(req.user.id, teamIds)
  const projects   = await projectSvc.listProjects({ id: projectIds, workspace_id: workspaceId })
}
```

## Data Models

### ProjectMember

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `project_id` | `text` | Project |
| `user_id` | `text` | User |
| `role` | `text` | `"manager"` \| `"member"` \| `"viewer"` |
| `created_at` | `datetime` | — |

### ProjectTeam

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `project_id` | `text` | Project |
| `team_id` | `text` | Team |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/projects/:id/access` | Enriched member + team list |
| `POST` | `/admin/projects/:id/members` | Add a user to a project |
| `DELETE` | `/admin/projects/:id/members/:userId` | Remove a user |
| `POST` | `/admin/projects/:id/teams` | Grant a team access |
| `DELETE` | `/admin/projects/:id/teams/:teamId` | Revoke team access |

## License

MIT
