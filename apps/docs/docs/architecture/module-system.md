---
id: module-system
title: Module System
description: Module(), MeridianService factory, loaders, and linkable config.
sidebar_position: 2
---

# Module System

Every domain in MeridianJS is a **module** — a self-contained unit with its own models, database connection, service, and DI scope. Modules are created with the `Module()` factory from `@meridianjs/framework-utils`.

---

## Module Definition

```typescript
import { Module } from '@meridianjs/framework-utils'
import ProjectModuleService from './service'
import { Project, Label, Milestone, ProjectStatus } from './models'
import defaultLoader from './loaders/default'

export default Module('projectModuleService', {
  service: ProjectModuleService,
  models: [Project, Label, Milestone, ProjectStatus],
  loaders: [defaultLoader],
  linkable: {
    project: { tableName: 'project', primaryKey: 'id' },
  },
})
```

The first argument is the **service key** — the name under which the service is registered in the DI container and used in route handlers:

```typescript
const svc = req.scope.resolve('projectModuleService') as ProjectModuleService
```

---

## MeridianService Factory

`MeridianService` is a generic service factory that auto-generates standard CRUD methods for each model you pass:

```typescript
import { MeridianService } from '@meridianjs/framework-utils'
import type { MeridianContainer } from '@meridianjs/types'
import ProjectModel from './models/project'

class ProjectModuleService extends MeridianService({ Project: ProjectModel }) {
  constructor(container: MeridianContainer) {
    super(container)
  }
  // Custom methods go here
}
```

### Auto-generated methods

For a model named `Project`, `MeridianService` generates:

| Method | Description |
|---|---|
| `listProjects(filters?, options?)` | Returns `Project[]` |
| `listAndCountProjects(filters?, options?)` | Returns `[Project[], number]` |
| `retrieveProject(id, options?)` | Returns a single `Project` or throws |
| `createProject(data)` | Inserts and returns new `Project` |
| `updateProject(id, data)` | Updates fields and returns updated `Project` |
| `deleteProject(id)` | Hard deletes |
| `softDeleteProject(id)` | Sets `deleted_at` (if model has the field) |

---

## Module Loader

The loader runs during the module-load phase. Its job is to set up the module's MikroORM instance and register repositories into the module-scoped DI container:

```typescript
// packages/modules/project/src/loaders/default.ts
import { createModuleOrm, createRepository } from '@meridianjs/framework-utils'
import type { LoaderOptions } from '@meridianjs/types'
import { ProjectSchema, LabelSchema } from '../models'

export default async function defaultLoader({ container }: LoaderOptions) {
  const config = container.resolve('config')
  const orm = await createModuleOrm(
    [ProjectSchema, LabelSchema],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()

  container.register({
    projectRepository: createRepository(em, 'project'),
    labelRepository: createRepository(em, 'label'),
    projectOrm: orm,
  })
}
```

In development mode, `createModuleOrm` runs `updateSchema({ safe: true })` automatically — it adds new columns/tables but never drops anything.

---

## Linkable Config

The `linkable` key exposes a module's entities for cross-module linking via junction tables. This lets the framework create a `ProjectWorkspaceLink` table that joins `project.id` with `workspace.id` without foreign keys between modules:

```typescript
linkable: {
  project: { tableName: 'project', primaryKey: 'id' },
}
```

Links are defined in `src/links/` files:

```typescript
// src/links/project-workspace.ts
import { defineLink } from '@meridianjs/framework-utils'
import ProjectModule from '@meridianjs/project'
import WorkspaceModule from '@meridianjs/workspace'

export default defineLink(
  ProjectModule.linkable.project,
  WorkspaceModule.linkable.workspace
)
```

---

## Custom Service Methods

Always store your own reference to the container — `MeridianService` uses a private `#container` field that subclasses cannot access:

```typescript
class ProjectModuleService extends MeridianService({ Project: ProjectModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async findProjectsByWorkspace(workspaceId: string) {
    const repo = this.container.resolve('projectRepository')
    return repo.find({ workspace_id: workspaceId })
  }
}
```
