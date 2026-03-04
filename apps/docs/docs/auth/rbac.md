---
id: rbac
title: RBAC & Permissions
description: Built-in roles, requireRoles guard, AppRole, and requirePermission.
sidebar_position: 2
---

# RBAC & Permissions

MeridianJS ships with two layers of access control:

1. **Built-in roles** — coarse-grained (`super-admin`, `admin`, `member`) enforced with `requireRoles()`
2. **Custom permissions** — fine-grained via `AppRole` model and `requirePermission()`

---

## Built-in Roles

| Role | Access |
|---|---|
| `super-admin` | Full access to all workspaces and all data |
| `admin` | Full access within their workspace |
| `member` | Read/write within their workspace, filtered by project membership |

Roles are stored in the JWT `roles` array. A user can have multiple roles.

---

## `requireRoles()` Guard

Apply in `middlewares.ts` to protect entire route prefixes:

```typescript
// src/api/middlewares.ts
import { requireRoles } from '@meridianjs/auth'

export default {
  routes: [
    {
      matcher: '/admin/workspaces',
      middlewares: [requireRoles('admin', 'super-admin')],
    },
  ],
}
```

Or inline in a single route handler:

```typescript
export async function DELETE(req: any, res: any) {
  // Only admins can delete projects
  requireRoles('admin', 'super-admin')(req, res, () => {
    // authorized — continue
  })
}
```

`requireRoles` reads `req.user.roles` and calls `next()` if any of the specified roles match. It responds with `403 Forbidden` otherwise.

---

## AppRole (Custom Permissions)

The `@meridianjs/app-role` module lets you define custom roles with fine-grained permission strings:

```typescript
// Create a custom role
const roleSvc = req.scope.resolve('appRoleModuleService') as AppRoleModuleService

const managerRole = await roleSvc.createAppRole({
  name: 'Project Manager',
  permissions: ['project:create', 'project:delete', 'sprint:manage', 'issue:assign'],
  workspace_id: 'ws_123',
})

// Assign role to user
await roleSvc.assignRoleToUser({ user_id: 'user_456', app_role_id: managerRole.id })
```

When a user with an `AppRole` logs in, their permission strings are included in the JWT `roles` array alongside the base role.

---

## `requirePermission()` Guard

```typescript
import { requirePermission } from '@meridianjs/auth'

export async function DELETE(req: any, res: any) {
  requirePermission('project:delete')(req, res, async () => {
    const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
    await svc.deleteProject(req.params.id)
    res.status(204).send()
  })
}
```

`requirePermission` checks `req.user.roles` for the exact permission string. Super-admins bypass all permission checks.

---

## Access Control Patterns

### Workspace-scoped access

```typescript
export async function GET(req: any, res: any) {
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes('super-admin') || roles.includes('admin')

  if (isPrivileged) {
    // Admins see all workspaces
    const workspaces = await workspaceSvc.listWorkspaces()
    return res.json(workspaces)
  }

  // Members see only workspaces they belong to
  const memberships = await workspaceMemberSvc.listWorkspaceMembers({ user_id: req.user.id })
  const workspaceIds = memberships.map(m => m.workspace_id)
  const workspaces = await workspaceSvc.listWorkspaces({ id: { $in: workspaceIds } })
  res.json(workspaces)
}
```

### Project-scoped access

Members can only see projects where they have an explicit `ProjectMember` or `ProjectTeam` record.
