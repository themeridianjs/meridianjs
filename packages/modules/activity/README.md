# @meridianjs/activity

Audit log module for MeridianJS. Records every significant action taken on domain entities — who did what, when, and what changed.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `activityModuleService`

```typescript
const svc = req.scope.resolve("activityModuleService") as any
```

### Methods

```typescript
// Record an audit entry — fire-and-forget safe (never throws)
await svc.recordActivity({
  entity_type:  "issue",
  entity_id:    issueId,
  actor_id:     req.user.id,
  action:       "status_changed",
  workspace_id: req.user.workspaceId,
  changes: {
    status: { from: "Todo", to: "In Progress" },
  },
})

// List all activity for a specific entity
const log = await svc.listActivityForEntity("issue", issueId)

// List all activity in a workspace
const log = await svc.listActivityByWorkspace(workspaceId)

// Standard CRUD
await svc.listActivities(filters?)
await svc.retrieveActivity(id)
await svc.deleteActivity(id)
```

## Data Model

### Activity

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `entity_type` | `text` | Entity kind (e.g. `"issue"`, `"project"`) |
| `entity_id` | `text` | ID of the affected entity |
| `actor_id` | `text` | User who performed the action |
| `action` | `text` | Action key (e.g. `"created"`, `"status_changed"`, `"assigned"`) |
| `workspace_id` | `text` | Owning workspace |
| `changes` | `json` | Before/after values for changed fields (nullable) |
| `created_at` | `datetime` | When the action occurred |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/issues/:id/activity` | Activity log for an issue |
| `GET` | `/admin/workspaces/:id/activity` | Workspace-wide activity feed |

## License

MIT
