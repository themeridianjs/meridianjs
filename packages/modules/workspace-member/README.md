# @meridianjs/workspace-member

Workspace membership module for MeridianJS. Tracks which users belong to which workspaces and their workspace-level role (`admin` or `member`). Used by route handlers to enforce workspace isolation.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `workspaceMemberModuleService`

```typescript
const svc = req.scope.resolve("workspaceMemberModuleService") as any
```

### Methods

```typescript
// Get all workspace IDs a user belongs to
const workspaceIds = await svc.getWorkspaceIdsForUser(userId)

// Get a specific membership record (returns null if not a member)
const membership = await svc.getMembership(workspaceId, userId)

// Check if a user is a member of a workspace
const isMember = await svc.isMember(workspaceId, userId)  // → boolean

// Add a user to a workspace if not already a member
await svc.ensureMember(workspaceId, userId, "member")

// Standard CRUD
await svc.listWorkspaceMembers(filters?)
await svc.createWorkspaceMember({ workspace_id, user_id, role })
await svc.updateWorkspaceMember(id, { role })
await svc.deleteWorkspaceMember(id)
```

## Access Control Pattern

Route handlers use this service to filter data by membership:

```typescript
const roles = req.user?.roles ?? []
const isPrivileged = roles.includes("admin") || roles.includes("super-admin")

if (isPrivileged) {
  // Return all workspaces
  const workspaces = await workspaceSvc.listWorkspaces()
} else {
  // Return only workspaces the user belongs to
  const ids = await memberSvc.getWorkspaceIdsForUser(req.user.id)
  const workspaces = await workspaceSvc.listWorkspaces({ id: ids })
}
```

## Data Model

### WorkspaceMember

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `workspace_id` | `text` | Workspace |
| `user_id` | `text` | User |
| `role` | `text` | `"admin"` \| `"member"` |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/workspaces/:id/members` | List / add members |
| `PATCH` | `/admin/workspaces/:id/members/:userId` | Update member role |
| `DELETE` | `/admin/workspaces/:id/members/:userId` | Remove member |

## License

MIT
