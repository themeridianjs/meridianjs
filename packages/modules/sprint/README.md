# @meridianjs/sprint

Sprint (cycle) module for MeridianJS. Manages time-boxed sprints within projects, with explicit lifecycle transitions: `planned → active → completed`.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `sprintModuleService`

```typescript
const svc = req.scope.resolve("sprintModuleService") as any
```

### Auto-generated CRUD

```typescript
await svc.listSprints(filters?, options?)
await svc.listAndCountSprints(filters?, options?)
await svc.retrieveSprint(id)
await svc.createSprint(data)
await svc.updateSprint(id, data)
await svc.deleteSprint(id)
```

### Custom Methods

```typescript
// List all sprints for a project
const sprints = await svc.listSprintsByProject(projectId)

// Start a sprint — transitions status: "planned" → "active"
// Sets start_date to now if not already set
// Throws 409 if already active or completed
const sprint = await svc.startSprint(sprintId)

// Complete a sprint — transitions status: "active" → "completed"
// Sets end_date to now if not already set
// Throws 409 if not active
const sprint = await svc.completeSprint(sprintId)
```

The `completeSprintWorkflow` (from `@meridianjs/meridian`) runs `completeSprint()` and moves any unfinished issues back to the backlog in one atomic operation.

## Data Model

### Sprint

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Sprint name (e.g. `"Sprint 1"`) |
| `project_id` | `text` | Owning project |
| `workspace_id` | `text` | Owning workspace |
| `status` | `text` | `"planned"` \| `"active"` \| `"completed"` |
| `goal` | `text` | Optional sprint goal description |
| `start_date` | `datetime` | Planned start (nullable) |
| `end_date` | `datetime` | Planned end (nullable) |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/projects/:id/sprints` | List / create sprints |
| `GET/PUT/DELETE` | `/admin/projects/:id/sprints/:sprintId` | Get / update / delete sprint |
| `POST` | `/admin/projects/:id/sprints/:sprintId/start` | Start a sprint |
| `POST` | `/admin/projects/:id/sprints/:sprintId/complete` | Complete a sprint |

## License

MIT
