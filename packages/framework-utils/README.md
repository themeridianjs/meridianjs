# @meridianjs/framework-utils

Core building blocks for creating MeridianJS modules: the DML (Data Modelling Language), the `MeridianService` factory, `Module()`, `defineLink()`, and ORM utilities.

## Installation

```bash
npm install @meridianjs/framework-utils
```

## Overview

Every domain module in a MeridianJS application is built with the primitives this package exports. You define your data models with `model`, generate CRUD services with `MeridianService`, wire up a module with `Module()`, and declare cross-module relationships with `defineLink()`.

## API Reference

### `model` — Data Modelling Language

Define a database entity without writing MikroORM decorators:

```typescript
import { model } from "@meridianjs/framework-utils"

export const Project = model("project", {
  id:          model.id(),            // UUID primary key, auto-generated
  name:        model.text(),          // VARCHAR
  description: model.text(),
  color:       model.text(),
  is_active:   model.boolean(),
  sort_order:  model.number(),
  metadata:    model.json(),
  status:      model.enum(["active", "archived"]),
  created_at:  model.dateTime(),
  updated_at:  model.dateTime(),
})
```

`model.id()` automatically creates a `uuid` primary key with `onCreate` auto-generation. `model.dateTime()` fields named `created_at` / `updated_at` are set automatically on create and update.

### `MeridianService` — Auto-generated CRUD

Pass a map of model names to model definitions and receive a class with full CRUD:

```typescript
import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { Project } from "./models/project.js"
import { Label } from "./models/label.js"

export class ProjectModuleService extends MeridianService({ Project, Label }) {
  constructor(container: MeridianContainer) {
    super(container)
  }

  // Auto-generated for Project:
  //   listProjects(filters?, options?)
  //   listAndCountProjects(filters?, options?)
  //   retrieveProject(id)
  //   createProject(data)
  //   updateProject(id, data)
  //   deleteProject(id)
  //   softDeleteProject(id)

  // Auto-generated for Label:
  //   listLabels, retrieveLabel, createLabel, updateLabel, deleteLabel ...

  // Add custom methods here
}
```

### `Module()` — Module Definition

Register a service + its models and loaders with the DI container:

```typescript
import { Module } from "@meridianjs/framework-utils"

export default Module("projectModuleService", {
  service: ProjectModuleService,
  models: [Project, Label, Milestone],
  loaders: [defaultLoader],
  linkable: {
    project: { tableName: "project", primaryKey: "id" },
  },
})
```

The `key` (first argument) is the container registration token — this is the name used in `container.resolve("projectModuleService")` and in route handlers via `req.scope.resolve("projectModuleService")`.

### `defineLink()` — Cross-module Relationships

Declare a join table between two modules without coupling them via foreign keys:

```typescript
import { defineLink } from "@meridianjs/framework-utils"
import ProjectModule from "@meridianjs/project"
import IssueModule from "@meridianjs/issue"

export default defineLink(
  { linkable: ProjectModule.linkable!.project },
  { linkable: IssueModule.linkable!.issue, isList: true, deleteCascades: true },
  { linkTableName: "project_issue_link", entryPoint: "projectIssueLink" }
)
```

### ORM Utilities

Used inside module loaders to initialise per-module MikroORM instances:

```typescript
import { dmlToEntitySchema, createModuleOrm, createRepository } from "@meridianjs/framework-utils"
import type { LoaderOptions } from "@meridianjs/types"
import { Project } from "../models/project.js"

const ProjectSchema = dmlToEntitySchema(Project)

export default async function defaultLoader({ container }: LoaderOptions) {
  const config = container.resolve("config") as any
  const orm = await createModuleOrm([ProjectSchema], config.projectConfig.databaseUrl)
  const em = orm.em.fork()
  container.register({
    projectRepository: createRepository(em, "project"),
    projectOrm: orm,
  })
}
```

Each module manages its own `MikroORM` instance and schema, keeping modules fully isolated from one another.

## License

MIT
