---
id: issue
title: Issue Module
description: Issue, Comment models, createIssueInProject, identifier generation.
sidebar_position: 4
---

# Issue Module (`@meridianjs/issue`)

The issue module is the core work-tracking domain. Issues belong to projects, optionally belong to a sprint, can be nested (parent/child), and track status changes via the activity log.

---

## Models

### Issue

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Primary key |
| `title` | `string` | Issue title |
| `description` | `string?` | Rich text description |
| `identifier` | `string` | Full identifier e.g. `MER-42` |
| `number` | `number` | Numeric part of the identifier |
| `status` | `string` | Free-form status key matching a `ProjectStatus.key` |
| `priority` | `string` | `'urgent' \| 'high' \| 'medium' \| 'low' \| 'no_priority'` |
| `project_id` | `string` | Owning project |
| `sprint_id` | `string?` | Active sprint (if any) |
| `assignee_id` | `string?` | Assigned user |
| `parent_id` | `string?` | Parent issue (for sub-issues) |
| `due_date` | `Date?` | |
| `estimate` | `number?` | Story points |
| `created_at` | `Date` | |
| `updated_at` | `Date` | |
| `deleted_at` | `Date?` | Soft-delete timestamp |

### Comment

| Field | Type | Description |
|---|---|---|
| `id` | `string` | |
| `body` | `string` | Comment text |
| `issue_id` | `string` | |
| `author_id` | `string` | User who wrote the comment |
| `created_at` | `Date` | |

---

## Identifier Generation

When an issue is created, `createIssueInProject()` auto-generates the identifier:

1. Fetches the project's `identifier` prefix (e.g. `MER`)
2. Counts existing issues in the project to determine the next number
3. Sets `issue.number = count + 1` and `issue.identifier = "MER-43"`

```typescript
const svc = req.scope.resolve('issueModuleService') as IssueModuleService

const issue = await svc.createIssueInProject({
  title: 'Fix login bug',
  project_id: 'proj_123',
  priority: 'high',
  status: 'todo',
})
// issue.identifier === "MER-1"
// issue.number === 1
```

---

## Key Service Methods

```typescript
// Standard CRUD
await svc.listIssues({ project_id: 'proj_123', status: 'in_progress' })
await svc.retrieveIssue('issue_123')
await svc.updateIssue('issue_123', { status: 'done', assignee_id: 'user_456' })
await svc.softDeleteIssue('issue_123')

// Specialized
await svc.createIssueInProject({ title, project_id, priority, status })
await svc.listIssuesByIdentifier('MER-42')  // used by plugin-github for commit linking

// Comments
await svc.listComments({ issue_id: 'issue_123' })
await svc.createComment({ body: 'Fixed in PR #99', issue_id: 'issue_123', author_id: 'user_456' })
await svc.deleteComment('comment_123')
```

---

## Workflows

All issue mutations run through workflows that automatically emit events and log activity:

| Workflow | Trigger | Events |
|---|---|---|
| `createIssueWorkflow` | `POST /admin/projects/:id/issues` | `issue.created` |
| `updateIssueStatusWorkflow` | `PATCH /admin/issues/:id/status` | `issue.status_changed` |
| `assignIssueWorkflow` | `PATCH /admin/issues/:id/assignee` | `issue.assigned` |

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/projects/:id/issues` | List issues for a project |
| `POST` | `/admin/projects/:id/issues` | Create issue (runs workflow) |
| `GET` | `/admin/issues/:id` | Get issue |
| `PATCH` | `/admin/issues/:id` | Update issue |
| `PATCH` | `/admin/issues/:id/status` | Update status (workflow) |
| `PATCH` | `/admin/issues/:id/assignee` | Assign issue (workflow) |
| `DELETE` | `/admin/issues/:id` | Soft delete |
| `GET` | `/admin/issues/:id/comments` | List comments |
| `POST` | `/admin/issues/:id/comments` | Add comment |
| `DELETE` | `/admin/issues/:id/comments/:commentId` | Delete comment |
