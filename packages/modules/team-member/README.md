# @meridianjs/team-member

Team membership module for MeridianJS. Tracks which users belong to which teams. Teams are workspace-scoped and can be granted access to projects as a group via `@meridianjs/project-member`.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `teamMemberModuleService`

```typescript
const svc = req.scope.resolve("teamMemberModuleService") as any
```

### Methods

```typescript
// Get all user IDs in a team
const userIds = await svc.getTeamMemberUserIds(teamId)

// Get all team IDs a user belongs to
const teamIds = await svc.getUserTeamIds(userId)

// Check membership
const isMember = await svc.isMember(teamId, userId)  // → boolean

// Add a user to a team if not already a member
await svc.ensureMember(teamId, userId)

// Remove a user from a team by team + user ID
await svc.removeByTeamAndUser(teamId, userId)

// Standard CRUD
await svc.listTeamMembers(filters?)
await svc.createTeamMember({ team_id, user_id })
await svc.deleteTeamMember(id)
```

## Data Model

### TeamMember

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `team_id` | `text` | Team (from `@meridianjs/user`) |
| `user_id` | `text` | User |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/workspaces/:id/teams/:teamId/members` | List / add team members |
| `DELETE` | `/admin/workspaces/:id/teams/:teamId/members/:userId` | Remove member from team |

## License

MIT
