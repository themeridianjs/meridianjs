# @meridianjs/notification

In-app notification module for MeridianJS. Creates notification records when domain events occur and exposes an API for reading and marking them as read.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## How Notifications Are Created

`@meridianjs/meridian` includes event subscribers that listen for domain events and call `notificationModuleService.createNotification()` automatically:

| Domain Event | Notification |
|---|---|
| `issue.created` | Notify workspace members |
| `issue.assigned` | Notify the assigned user |
| `issue.status_changed` | Notify the reporter / assignees |
| `comment.created` | Notify the issue's participants |
| `sprint.completed` | Notify project members |

## Service: `notificationModuleService`

```typescript
const svc = req.scope.resolve("notificationModuleService") as any
```

### Methods

```typescript
// Create a notification for a user
await svc.createNotification({
  user_id:      userId,
  entity_type:  "issue",
  entity_id:    issueId,
  action:       "assigned",
  message:      "You were assigned to SITE-42",
  workspace_id: workspaceId,
  metadata:     { issueTitle: "Fix login crash" },  // optional
})

// Standard CRUD
await svc.listNotifications(filters?)
await svc.listAndCountNotifications(filters?)
await svc.retrieveNotification(id)
await svc.updateNotification(id, data)
await svc.deleteNotification(id)
```

## Data Model

### Notification

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `text` | Recipient user ID |
| `entity_type` | `text` | Entity kind (e.g. `"issue"`, `"comment"`) |
| `entity_id` | `text` | ID of the related entity |
| `action` | `text` | Action key (e.g. `"assigned"`, `"commented"`) |
| `message` | `text` | Human-readable notification text (nullable) |
| `read` | `boolean` | Whether the user has read it |
| `workspace_id` | `text` | Owning workspace |
| `metadata` | `json` | Additional context (nullable) |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/notifications` | List notifications for the current user |
| `PATCH` | `/admin/notifications/:id/read` | Mark a notification as read |
| `POST` | `/admin/notifications/read-all` | Mark all notifications as read |

## License

MIT
