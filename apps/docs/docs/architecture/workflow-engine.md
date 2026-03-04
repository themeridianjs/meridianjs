---
id: workflow-engine
title: Workflow Engine
description: createStep, createWorkflow, LIFO compensation, and saga pattern.
sidebar_position: 5
---

# Workflow Engine

The `@meridianjs/workflow-engine` package provides a DAG-based saga runner. Every mutation in MeridianJS goes through a typed workflow with automatic rollback (compensation) on failure.

---

## Defining a Step

A step has a forward function and an optional compensation (rollback) function:

```typescript
import { createStep } from '@meridianjs/workflow-engine'

const createProjectStep = createStep(
  'create-project',
  // Forward — runs on the happy path
  async (input: { name: string; workspace_id: string }, context) => {
    const svc = context.container.resolve('projectModuleService') as ProjectModuleService
    const project = await svc.createProject(input)
    return { project }
  },
  // Compensation — runs if a later step fails
  async (output: { project: { id: string } }, context) => {
    const svc = context.container.resolve('projectModuleService') as ProjectModuleService
    await svc.deleteProject(output.project.id)
  }
)
```

The compensation receives the **output of the forward function** — so you always have access to the IDs you need to undo the work.

---

## Defining a Workflow

Chain steps together with `createWorkflow`. Steps execute in declaration order; compensation runs in **reverse (LIFO) order**:

```typescript
import { createWorkflow } from '@meridianjs/workflow-engine'

export const createProjectWorkflow = createWorkflow(
  'create-project',
  [
    createProjectStep,
    seedDefaultStatusesStep,
    createProjectMemberStep,
    emitProjectCreatedEventStep,
  ]
)
```

If `emitProjectCreatedEventStep` fails, the engine runs:
1. `createProjectMemberStep` compensation
2. `seedDefaultStatusesStep` compensation
3. `createProjectStep` compensation (deletes the project)

---

## Running a Workflow

Pass `req.scope` so steps can resolve services from the DI container:

```typescript
export async function POST(req: any, res: any) {
  const { result, errors, transaction_status } =
    await createProjectWorkflow(req.scope).run({
      input: {
        name: req.body.name,
        workspace_id: req.body.workspace_id,
      },
    })

  if (transaction_status === 'reverted') {
    // All completed steps have been compensated
    res.status(500).json({ error: { message: errors[0].message } })
    return
  }

  res.status(201).json(result)
}
```

### Return values

| Field | Type | Description |
|---|---|---|
| `result` | `unknown` | Output of the last step |
| `errors` | `Error[]` | Errors from failed steps |
| `transaction_status` | `'done' \| 'reverted' \| 'failed'` | Final saga state |

- `done` — all steps succeeded
- `reverted` — a step failed and all compensations completed successfully
- `failed` — a step failed and at least one compensation also failed (needs manual intervention)

---

## Step Context

Steps receive a `context` object with:

```typescript
interface StepContext {
  container: MeridianContainer  // request-scoped DI container
  input: unknown                 // step's own input (passed from previous step output)
}
```

---

## Built-in Workflows

`@meridianjs/meridian` ships these workflows:

| Workflow | Description |
|---|---|
| `createProjectWorkflow` | Creates project + seeds statuses + emits event |
| `createIssueWorkflow` | Creates issue + logs activity + emits event |
| `updateIssueStatusWorkflow` | Updates status + logs activity + emits event |
| `assignIssueWorkflow` | Assigns issue + logs activity + sends notification |
| `completeSprintWorkflow` | Completes sprint + moves open issues + emits event |
