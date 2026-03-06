---
id: build-a-module
title: "Tutorial: Build a Module — Project Budget Tracker"
description: Step-by-step guide to building a custom Meridian module for tracking project budgets.
sidebar_position: 1
---

# Tutorial: Build a Module — Project Budget Tracker

This tutorial walks you through building a **`ProjectBudget` module** from scratch. By the end you will have a working module that:

- Persists budget data in its own database table
- Exposes auto-generated CRUD via the service factory
- Adds two custom domain methods: `recordExpense` and `getBudgetSummary`
- Declares itself as `linkable` so other modules can join against it

:::info When to use a module
Create a module any time you need to **persist a new type of entity**. Budget data doesn't belong inside the existing `project` model — it has its own lifecycle and its own set of operations. Any route handler or plugin can then resolve your service from the DI container.
:::

---

## What we're building

A `project_budget` table with one row per project, tracking `total_amount`, `spent_amount`, and `currency`. The service exposes:

| Method | Description |
|---|---|
| `createProjectBudget(data)` | Auto-generated — set the initial budget |
| `retrieveProjectBudget(id)` | Auto-generated — fetch by ID |
| `updateProjectBudget(id, data)` | Auto-generated — adjust totals |
| `recordExpense(projectId, amount)` | Custom — increment `spent_amount` |
| `getBudgetSummary(projectId)` | Custom — return totals + remaining |

---

## File structure

```
src/modules/project-budget/
├── models/
│   └── project-budget.ts
├── loaders/
│   └── default.ts
├── service.ts
└── index.ts
```

---

## Step 1 — Define the model

```typescript
// src/modules/project-budget/models/project-budget.ts
import { model } from "@meridianjs/framework-utils"

const ProjectBudgetModel = model.define("project_budget", {
  id:           model.id(),
  project_id:   model.text(),
  total_amount: model.number(),
  spent_amount: model.number().default(0),
  currency:     model.text().default("USD"),
  notes:        model.text().nullable(),
})

export default ProjectBudgetModel
```

`model.define` maps directly to a MikroORM entity. The framework auto-syncs the schema on startup in dev (`updateSchema({ safe: true })` — adds columns, never drops them).

---

## Step 2 — Write the service

`MeridianService` auto-generates `listProjectBudgets`, `retrieveProjectBudget`, `createProjectBudget`, `updateProjectBudget`, `deleteProjectBudget`, and `softDeleteProjectBudget`. Extend it with your own domain methods:

```typescript
// src/modules/project-budget/service.ts
import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import ProjectBudgetModel from "./models/project-budget.js"

export class ProjectBudgetModuleService extends MeridianService({ ProjectBudget: ProjectBudgetModel }) {
  // Store a reference — MeridianService uses a private #container field
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Add an expense and return the updated budget record. */
  async recordExpense(projectId: string, amount: number): Promise<any> {
    const repo = this.container.resolve("projectBudgetRepository") as any
    const budget = await repo.findOne({ project_id: projectId })
    if (!budget) throw new Error(`No budget configured for project ${projectId}`)
    budget.spent_amount += amount
    await repo.persistAndFlush(budget)
    return budget
  }

  /** Return a summary with the remaining balance. */
  async getBudgetSummary(projectId: string): Promise<{
    total_amount: number
    spent_amount: number
    remaining:    number
    currency:     string
  }> {
    const repo = this.container.resolve("projectBudgetRepository") as any
    const budget = await repo.findOne({ project_id: projectId })
    if (!budget) throw new Error(`No budget configured for project ${projectId}`)
    return {
      total_amount: budget.total_amount,
      spent_amount: budget.spent_amount,
      remaining:    budget.total_amount - budget.spent_amount,
      currency:     budget.currency,
    }
  }
}
```

:::tip
Always store your own `container` reference in the constructor. `MeridianService` declares `#container` as a private field, so subclasses cannot access it directly.
:::

---

## Step 3 — Write the loader

The loader runs at startup. It creates an isolated MikroORM instance for this module and registers the repository in the module-scoped DI container:

```typescript
// src/modules/project-budget/loaders/default.ts
import { createModuleOrm, createRepository } from "@meridianjs/framework-utils"
import type { LoaderOptions } from "@meridianjs/types"
import ProjectBudgetSchema from "../models/project-budget.js"

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve("config") as any
  const orm = await createModuleOrm([ProjectBudgetSchema], config.projectConfig.databaseUrl)
  const em = orm.em.fork()
  container.register({
    projectBudgetRepository: createRepository(em, "project_budget"),
    projectBudgetOrm: orm,
  })
}
```

Each module owns its own ORM instance — modules never share an EntityManager.

---

## Step 4 — Export the module

```typescript
// src/modules/project-budget/index.ts
import { Module } from "@meridianjs/framework-utils"
import { ProjectBudgetModuleService } from "./service.js"
import ProjectBudgetModel from "./models/project-budget.js"
import defaultLoader from "./loaders/default.js"

export default Module("projectBudgetModuleService", {
  service: ProjectBudgetModuleService,
  models: [ProjectBudgetModel],
  loaders: [defaultLoader],
  linkable: {
    projectBudget: { tableName: "project_budget", primaryKey: "id" },
  },
})
```

The first argument (`"projectBudgetModuleService"`) is the DI container token that route handlers use to resolve the service.

`linkable` lets other modules define join relationships against this table without adding a foreign key.

---

## Step 5 — Register in config

```typescript
// meridian.config.ts
export default defineConfig({
  projectConfig: { /* ... */ },
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
    { resolve: "./src/modules/project-budget/index.ts" }, // ← add this
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

---

## Step 6 — Add route handlers

Route files live in `src/api/` and are file-based — the path maps directly to the URL.

```typescript
// src/api/admin/projects/[id]/budget/route.ts
import type { Request, Response } from "express"
import type { ProjectBudgetModuleService } from "../../../modules/project-budget/service.js"

export async function GET(req: Request, res: Response) {
  const svc = (req as any).scope.resolve("projectBudgetModuleService") as ProjectBudgetModuleService
  const summary = await svc.getBudgetSummary(req.params.id)
  res.json({ budget: summary })
}

export async function POST(req: Request, res: Response) {
  const svc = (req as any).scope.resolve("projectBudgetModuleService") as ProjectBudgetModuleService
  const { amount } = req.body
  const budget = await svc.recordExpense(req.params.id, amount)
  res.json({ budget })
}
```

This registers `GET /admin/projects/:id/budget` and `POST /admin/projects/:id/budget` automatically.

---

## What you built

```
GET  /admin/projects/:id/budget        → getBudgetSummary
POST /admin/projects/:id/budget        → recordExpense
POST /admin/projects/:id/budget/setup  → createProjectBudget (auto-generated)
```

The module is fully isolated, has its own schema, and is resolvable from any route or subscriber in the application.
