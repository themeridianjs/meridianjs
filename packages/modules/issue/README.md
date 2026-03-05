# @meridianjs/issue

Issue tracking module for MeridianJS. Manages issues, comments, attachments, time logs, and task lists. Supports parent/child issue nesting, sprint assignments, recurrence, and file uploads.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `issueModuleService`

```typescript
const svc = req.scope.resolve("issueModuleService") as any
```

### Auto-generated CRUD

```typescript
// Issues
await svc.listIssues(filters?, options?)
await svc.listAndCountIssues(filters?, options?)
await svc.retrieveIssue(id)
await svc.createIssue(data)
await svc.updateIssue(id, data)
await svc.deleteIssue(id)
await svc.softDeleteIssue(id)

// Comments
await svc.listComments(filters?)
await svc.createComment(data)
await svc.updateComment(id, data)
await svc.deleteComment(id)

// Attachments
await svc.listAttachments(filters?)
await svc.createAttachment(data)
await svc.deleteAttachment(id)

// Time Logs
await svc.listTimeLogs(filters?)
await svc.createTimeLog(data)
await svc.deleteTimeLog(id)
```

### Custom Methods

```typescript
// Create an issue with automatic number + identifier generation
// (e.g. identifier: "SITE-42")
const issue = await svc.createIssueInProject({
  title:        "Fix login crash",
  project_id:   projectId,
  workspace_id: workspaceId,
  type:         "bug",
  priority:     "urgent",
  status:       "Todo",
  sprint_id:    sprintId,   // optional
  parent_id:    parentId,   // optional — for sub-issues
})

// Log time manually
const log = await svc.createManualTimeLog({
  issue_id:         issueId,
  user_id:          userId,
  workspace_id:     workspaceId,
  duration_minutes: 90,
  description:      "Investigated root cause",
  logged_date:      new Date(),
})

// List issues by project
const issues = await svc.listIssuesByProject(projectId)

// List issues by sprint
const issues = await svc.listIssuesBySprint(sprintId)
```

## Data Models

### Issue

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `identifier` | `text` | Human-readable ID (e.g. `"SITE-42"`) |
| `number` | `number` | Numeric part of identifier |
| `title` | `text` | Issue title |
| `description` | `text` | Rich-text description (nullable) |
| `type` | `text` | `"bug"` \| `"feature"` \| `"task"` \| `"epic"` \| `"story"` |
| `priority` | `text` | `"urgent"` \| `"high"` \| `"medium"` \| `"low"` \| `"none"` |
| `status` | `text` | Free-form key matching a `ProjectStatus.key` |
| `project_id` | `text` | Owning project |
| `workspace_id` | `text` | Owning workspace |
| `sprint_id` | `text` | Assigned sprint (nullable) |
| `parent_id` | `text` | Parent issue for sub-issues (nullable) |
| `reporter_id` | `text` | Creator (nullable) |
| `estimate` | `number` | Story point estimate (nullable) |
| `start_date` | `datetime` | Planned start (nullable) |
| `due_date` | `datetime` | Deadline (nullable) |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

The `status` field is a free-form text key (not an enum) so it can match any `ProjectStatus.key` defined on the project.

### Comment

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `issue_id` | `text` | Parent issue |
| `author_id` | `text` | Commenter's user ID |
| `body` | `text` | Comment text |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/projects/:id/issues` | List / create issues |
| `GET/PUT/DELETE` | `/admin/projects/:id/issues/:issueId` | Get / update / delete issue |
| `POST` | `/admin/projects/:id/issues/:issueId/comments` | Add comment |
| `PUT/DELETE` | `/admin/issues/:issueId/comments/:commentId` | Edit / delete comment |
| `POST` | `/admin/issues/:issueId/attachments` | Upload attachment |
| `DELETE` | `/admin/issues/:issueId/attachments/:attachmentId` | Delete attachment |
| `POST` | `/admin/issues/:issueId/time-logs` | Log time |

## License

MIT
