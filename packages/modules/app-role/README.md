# @meridianjs/app-role

Custom RBAC roles module for MeridianJS. Allows administrators to define named roles with arbitrary permission strings, then assign them to users. Permissions flow into the JWT and are available via `req.user.permissions` and the `requirePermission()` guard.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Overview

The built-in roles (`super-admin`, `admin`, `member`) are broad — they grant or restrict access to entire route groups. `AppRole` lets you go further: define custom roles with precise permission strings and guard individual endpoints with `requirePermission()`.

## Service: `appRoleModuleService`

```typescript
const svc = req.scope.resolve("appRoleModuleService") as any
```

### Methods

```typescript
// Get the permission array for a role
const permissions = await svc.getPermissionsForRole(roleId)
// → ["issues:create", "issues:delete", "sprints:manage"]

// Standard CRUD
await svc.listAppRoles(filters?)
await svc.retrieveAppRole(id)
await svc.createAppRole({ name: "Developer", permissions: ["issues:create", "issues:update"] })
await svc.updateAppRole(id, { permissions: [...] })
await svc.deleteAppRole(id)
```

## Assigning Roles to Users

```typescript
// Assign a custom role to a user
const userSvc = container.resolve("userModuleService") as any
await userSvc.updateUser(userId, { app_role_id: roleId })
```

When the user authenticates, their permissions are loaded from the assigned `AppRole` and included in the JWT under `permissions: string[]`.

## Guarding Routes

```typescript
import { requirePermission } from "@meridianjs/auth"
import { authenticateJWT } from "@meridianjs/auth"

export const DELETE = [
  authenticateJWT,
  requirePermission("issues:delete"),
  async (req: any, res: Response) => {
    // Only users with the "issues:delete" permission reach here
  },
]
```

## Data Model

### AppRole

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Display name (e.g. `"Developer"`) |
| `permissions` | `json` | Array of permission strings |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/roles` | List / create custom roles |
| `GET/PUT/DELETE` | `/admin/roles/:id` | Get / update / delete a role |
| `POST` | `/admin/users/:id/role` | Assign a role to a user |

## License

MIT
