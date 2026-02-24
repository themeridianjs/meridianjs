import type { StepContext } from "@meridianjs/types"
import { StepResponse } from "./step-response.js"
import { getWorkflowRunContext } from "./run-context.js"

type InvokeFn<TInput, TOutput, TCompInput> = (
  input: TInput,
  ctx: StepContext
) => Promise<TOutput | StepResponse<TOutput, TCompInput>>

type CompensateFn<TCompInput> = (
  input: TCompInput,
  ctx: StepContext
) => Promise<void>

/**
 * Defines a workflow step with an optional compensation (rollback) function.
 *
 * Returns a step function `(input: TInput) => Promise<TOutput>`.
 * When called inside a workflow, automatically registers the compensation
 * on the LIFO stack so it runs if a later step fails.
 *
 * @example
 * const createProjectStep = createStep(
 *   "create-project",
 *   async (input: CreateProjectInput, { container }) => {
 *     const svc = container.resolve("projectModuleService") as any
 *     const project = await svc.createProject(input)
 *     return new StepResponse(project, { projectId: project.id })
 *   },
 *   async ({ projectId }, { container }) => {
 *     const svc = container.resolve("projectModuleService") as any
 *     await svc.deleteProject(projectId)
 *   }
 * )
 */
export function createStep<TInput, TOutput, TCompInput = TOutput>(
  name: string,
  invoke: InvokeFn<TInput, TOutput, TCompInput>,
  compensate?: CompensateFn<TCompInput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const runCtx = getWorkflowRunContext()
    const stepCtx: StepContext = { container: runCtx.container }

    const result = await invoke(input, stepCtx)

    let output: TOutput
    let compInput: TCompInput

    if (result instanceof StepResponse) {
      output = result.output
      compInput = result.compensateInput as TCompInput
    } else {
      output = result as TOutput
      compInput = result as unknown as TCompInput
    }

    if (compensate) {
      // Capture current stepCtx in closure — safe because we don't reuse containers
      const capturedCompInput = compInput
      runCtx.compensationStack.push(
        async () => compensate(capturedCompInput, stepCtx)
      )
    }

    return output
  }
}
