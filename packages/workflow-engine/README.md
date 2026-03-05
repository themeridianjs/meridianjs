# @meridianjs/workflow-engine

DAG-based workflow engine for MeridianJS with LIFO saga compensation. Define multi-step operations where each step declares a rollback function — if any step fails, all previously completed steps are automatically compensated in reverse order.

## Installation

```bash
npm install @meridianjs/workflow-engine
```

## Overview

Workflows are used for any operation that touches multiple services or needs transactional guarantees. Every mutation route in a MeridianJS application runs through a workflow.

## Core Concepts

### Steps

A step is the atomic unit of a workflow. It has a **forward** function (the operation) and an optional **compensation** function (the rollback):

```typescript
import { createStep, StepResponse } from "@meridianjs/workflow-engine"
import type { MeridianContainer } from "@meridianjs/types"

const createProjectStep = createStep(
  "create-project",
  async (input: { name: string; workspace_id: string }, { container }: { container: MeridianContainer }) => {
    const svc = container.resolve("projectModuleService") as any
    const project = await svc.createProject(input)
    return new StepResponse({ project }, { projectId: project.id })
  },
  // Compensation — called if a later step fails
  async ({ projectId }: { projectId: string }, { container }: { container: MeridianContainer }) => {
    const svc = container.resolve("projectModuleService") as any
    await svc.deleteProject(projectId)
  }
)
```

`StepResponse` takes two arguments: the **output** (passed to the next step) and the **compensation data** (passed back to the compensation function if needed).

### Workflows

Wire steps together into a named workflow:

```typescript
import { createWorkflow, WorkflowResponse } from "@meridianjs/workflow-engine"

interface CreateProjectInput {
  name: string
  workspace_id: string
  identifier?: string
}

export const createProjectWorkflow = createWorkflow(
  "create-project",
  (input: CreateProjectInput) => {
    const projectResult = createProjectStep(input)
    const statusResult  = seedDefaultStatusesStep(projectResult)
    return new WorkflowResponse(statusResult)
  }
)
```

### Running a Workflow

Call the workflow from a route handler using `req.scope` as the container:

```typescript
export const POST = async (req: any, res: Response) => {
  const { result, errors, transaction_status } = await createProjectWorkflow(req.scope).run({
    input: req.body,
  })

  if (transaction_status === "reverted") {
    res.status(500).json({ error: { message: errors[0].message } })
    return
  }

  res.status(201).json({ project: result.project })
}
```

| `transaction_status` | Meaning |
|---|---|
| `"done"` | All steps completed successfully |
| `"reverted"` | A step failed; compensation ran for all previous steps |

### Conditional Branching

Use `when()` to execute steps conditionally:

```typescript
import { when } from "@meridianjs/workflow-engine"

const workflowResult = createWorkflow("my-workflow", (input: Input) => {
  const base = createBaseStep(input)
  const extra = when(base, (data) => data.needsExtra === true, () => extraStep(base))
  return new WorkflowResponse(extra)
})
```

### Data Transformation

Use `transform()` to reshape step output before passing it to the next step:

```typescript
import { transform } from "@meridianjs/workflow-engine"

const shaped = transform(stepResult, (data) => ({
  projectId: data.project.id,
  workspaceId: data.project.workspace_id,
}))
```

## API Reference

| Export | Description |
|---|---|
| `createStep(name, forward, compensate?)` | Define a step with optional rollback |
| `createWorkflow(name, builder)` | Define a workflow from a step composition function |
| `StepResponse(output, compensationData?)` | Wrap step output + compensation payload |
| `WorkflowResponse(stepResult)` | Declare the workflow's final return value |
| `transform(input, fn)` | Reshape step output |
| `when(input, condition, fn)` | Conditionally run a step |

## License

MIT
