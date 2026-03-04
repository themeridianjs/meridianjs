---
id: project
title: Project Module
description: Project, Label, Milestone, ProjectStatus models and service.
sidebar_position: 3
---

# Project Module (`@meridianjs/project`)

The project module manages the top-level container for work: projects contain issues, labels, milestones, sprints, and custom statuses.

---

## Models

### Project

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Primary key |
| `name` | `string` | Project display name |
| `identifier` | `string` | Short code (e.g. "MER") for issue identifiers |
| `description` | `string?` | Optional description |
| `workspace_id` | `string` | Owning workspace |
| `created_at` | `Date` | |
| `updated_at` | `Date` | |

### Label

| Field | Type | Description |
|---|---|---|
| `id` | `string` | |
| `name` | `string` | Display name |
| `color` | `string` | Hex color (e.g. `#6366f1`) |
| `project_id` | `string` | |

### Milestone

| Field | Type | Description |
|---|---|---|
| `id` | `string` | |
| `name` | `string` | |
| `due_date` | `Date?` | |
| `project_id` | `string` | |

### ProjectStatus

Custom workflow states for the project's Kanban board.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | |
| `name` | `string` | Display name (e.g. "In Review") |
| `key` | `string` | Unique slug used as `Issue.status` value |
| `color` | `string` | Hex color |
| `position` | `number` | Column order (0-indexed) |
| `category` | `string` | `'todo' \| 'in_progress' \| 'done' \| 'cancelled'` |
| `project_id` | `string` | |

---

## Key Service Methods

```typescript
const svc = req.scope.resolve('projectModuleService') as ProjectModuleService

// Standard CRUD (auto-generated)
await svc.listProjects({ workspace_id: 'ws_123' })
await svc.retrieveProject('proj_123')
await svc.createProject({ name: 'Backend', identifier: 'BE', workspace_id: 'ws_123' })
await svc.updateProject('proj_123', { name: 'Backend API' })
await svc.deleteProject('proj_123')

// ProjectStatus methods
await svc.listProjectStatuses({ project_id: 'proj_123' })
await svc.createProjectStatus({ name: 'In Review', key: 'in_review', color: '#f59e0b', position: 2, category: 'in_progress', project_id: 'proj_123' })
await svc.reorderProjectStatuses('proj_123', ['status_1', 'status_2', 'status_3'])
```

---

## Default Statuses

When a project is created via `createProjectWorkflow`, six default statuses are seeded automatically:

| Name | Key | Category |
|---|---|---|
| Backlog | `backlog` | `todo` |
| Todo | `todo` | `todo` |
| In Progress | `in_progress` | `in_progress` |
| In Review | `in_review` | `in_progress` |
| Done | `done` | `done` |
| Cancelled | `cancelled` | `cancelled` |

You can pass `initial_statuses` to the workflow to override these defaults.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/projects` | List projects (filtered by membership for non-admins) |
| `POST` | `/admin/projects` | Create project (runs `createProjectWorkflow`) |
| `GET` | `/admin/projects/:id` | Get project |
| `PUT` | `/admin/projects/:id` | Update project |
| `DELETE` | `/admin/projects/:id` | Delete project |
| `GET` | `/admin/projects/:id/statuses` | List custom statuses |
| `POST` | `/admin/projects/:id/statuses` | Create status |
| `PUT` | `/admin/projects/:id/statuses/:statusId` | Update status |
| `DELETE` | `/admin/projects/:id/statuses/:statusId` | Delete status |
| `POST` | `/admin/projects/:id/statuses/reorder` | Reorder statuses |
