# @meridianjs/workspace

Workspace module for MeridianJS. Provides the `Workspace` model and service for multi-tenant project management, including slug generation and lookup.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `workspaceModuleService`

```typescript
const svc = req.scope.resolve("workspaceModuleService") as any
```

### Auto-generated CRUD

```typescript
await svc.listWorkspaces(filters?, options?)
await svc.listAndCountWorkspaces(filters?, options?)
await svc.retrieveWorkspace(id)
await svc.createWorkspace(data)
await svc.updateWorkspace(id, data)
await svc.deleteWorkspace(id)
await svc.softDeleteWorkspace(id)
```

### Custom Methods

```typescript
// Find a workspace by its URL slug (returns null if not found)
const workspace = await svc.retrieveWorkspaceBySlug("acme-corp")

// Generate a URL-safe slug from a workspace name
const slug = svc.generateSlug("Acme Corp")  // → "acme-corp"
```

## Data Model

### Workspace

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Display name |
| `slug` | `text` | URL-safe identifier (unique) |
| `plan` | `enum` | `"free"` \| `"pro"` \| `"enterprise"` |
| `logo_url` | `text` | Workspace logo (nullable) |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

## API Routes

Provided by `@meridianjs/meridian`:

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/workspaces` | List workspaces (filtered by membership for non-admins) |
| `POST` | `/admin/workspaces` | Create workspace (auto-adds creator as admin member) |
| `GET` | `/admin/workspaces/:id` | Get workspace |
| `PUT` | `/admin/workspaces/:id` | Update workspace |
| `DELETE` | `/admin/workspaces/:id` | Delete workspace |

## License

MIT
