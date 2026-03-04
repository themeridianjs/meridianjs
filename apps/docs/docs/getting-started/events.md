---
id: events
title: Platform Events
description: Events emitted by MeridianJS core workflows and APIs.
sidebar_position: 6
---

# Platform Events

Core events emitted by `@meridianjs/meridian`:

| Event | Emitted from | Typical data payload | Built-in subscriber |
|---|---|---|---|
| `issue.created` | `create-issue` workflow | `issue_id`, `project_id`, `workspace_id`, `actor_id`, `assignee_ids`, `reporter_id` | Yes |
| `issue.assigned` | `assign-issue` workflow | `issue_id`, `project_id`, `workspace_id`, `actor_id`, `assignee_ids` | Yes |
| `issue.status_changed` | `update-issue-status` workflow | `issue_id`, `workspace_id`, `actor_id`, `new_status` | Yes |
| `comment.created` | `POST /admin/issues/:id/comments` | `comment_id`, `issue_id`, `author_id` | Yes |
| `workspace.member_invited` | `create-invitation` workflow | `invitation_id`, `workspace_id`, `email`, `role`, `created_by` | Yes |
| `project.member_added` | `POST /admin/projects/:id/members` | `project_id`, `project_name`, `workspace_id`, `user_id`, `actor_id` | Yes |
| `project.created` | `create-project` workflow | `project_id`, `workspace_id`, `actor_id` | No (add your own) |
| `sprint.completed` | `complete-sprint` workflow | `sprint_id`, `project_id`, `actor_id` | No (add your own) |

Optional plugin event:

| Event | Emitted from | Typical data payload |
|---|---|---|
| `webhook.received` | `@meridianjs/plugin-webhook` (`POST /webhooks/:provider`) | `id`, `provider`, `event_type`, `payload` |
