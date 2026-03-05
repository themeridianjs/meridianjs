# @meridianjs/project

Project module for MeridianJS. Manages projects, labels, milestones, and custom project statuses. The Kanban board columns and issue status fields are driven entirely by `ProjectStatus` records — not hard-coded enums.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `projectModuleService`

```typescript
const svc = req.scope.resolve("projectModuleService") as any
```

### Auto-generated CRUD

```typescript
// Projects
await svc.listProjects(filters?, options?)
await svc.listAndCountProjects(filters?, options?)
await svc.retrieveProject(id)
await svc.createProject(data)
await svc.updateProject(id, data)
await svc.deleteProject(id)

// Labels
await svc.listLabels(filters?)
await svc.createLabel(data)
await svc.updateLabel(id, data)
await svc.deleteLabel(id)

// Milestones
await svc.listMilestones(filters?)
await svc.createMilestone(data)
await svc.updateMilestone(id, data)
await svc.deleteMilestone(id)

// Project Statuses
await svc.listProjectStatuses(filters?)
await svc.retrieveProjectStatus(id)
await svc.createProjectStatus(data)
await svc.updateProjectStatus(id, data)
await svc.deleteProjectStatus(id)
```

### Custom Methods

```typescript
// Find a project by its short identifier (e.g. "SITE", "APP")
const project = await svc.retrieveProjectByIdentifier("SITE")

// Auto-generate an identifier from a project name
const identifier = svc.generateIdentifier("Website Redesign")  // → "WEBS"

// List all labels for a project
const labels = await svc.listLabelsByProject(projectId)

// List all statuses for a project, ordered by position
const statuses = await svc.listStatusesByProject(projectId)
```

## Data Models

### Project

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Project name |
| `identifier` | `text` | Short uppercase code (e.g. `"SITE"`) |
| `description` | `text` | Optional description |
| `color` | `text` | Hex colour for UI |
| `workspace_id` | `text` | Owning workspace |
| `status` | `text` | `"active"` \| `"archived"` \| `"paused"` |
| `visibility` | `text` | `"private"` \| `"public"` \| `"workspace"` |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

### ProjectStatus

Custom Kanban columns. Created automatically by `createProjectWorkflow` with 6 defaults, then fully managed via the statuses API.

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `project_id` | `text` | Owning project |
| `name` | `text` | Display name (e.g. `"In Progress"`) |
| `key` | `text` | Machine key (e.g. `"in_progress"`) |
| `color` | `text` | Hex colour for the Kanban column |
| `category` | `text` | `"backlog"` \| `"unstarted"` \| `"started"` \| `"completed"` \| `"cancelled"` |
| `position` | `number` | Column order |

### Default Statuses (seeded on project creation)

| Name | Key | Category |
|---|---|---|
| Backlog | `backlog` | `backlog` |
| Todo | `todo` | `unstarted` |
| In Progress | `in_progress` | `started` |
| In Review | `in_review` | `started` |
| Done | `done` | `completed` |
| Cancelled | `cancelled` | `cancelled` |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/projects` | List / create projects |
| `GET/PUT/DELETE` | `/admin/projects/:id` | Get / update / delete project |
| `GET/POST` | `/admin/projects/:id/statuses` | List / create custom statuses |
| `PUT/DELETE` | `/admin/projects/:id/statuses/:statusId` | Update / delete a status |
| `POST` | `/admin/projects/:id/statuses/reorder` | Reorder columns |
| `GET/POST` | `/admin/projects/:id/labels` | Manage project labels |
| `GET/POST` | `/admin/projects/:id/milestones` | Manage milestones |

## License

MIT
