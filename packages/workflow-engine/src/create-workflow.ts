import type { MeridianContainer } from "@meridian/types"
import { WorkflowResponse } from "./workflow-response.js"
import { workflowRunContext, type WorkflowRunContextStore } from "./run-context.js"

export type WorkflowTransactionStatus = "done" | "reverted" | "failed"

export interface WorkflowResult<TOutput> {
  result: TOutput
  errors: Error[]
  transaction_status: WorkflowTransactionStatus
}

export interface WorkflowRunner<TInput, TOutput> {
  run(opts: { input: TInput }): Promise<WorkflowResult<TOutput>>
}

/**
 * Defines a named workflow with a constructor function that orchestrates steps.
 *
 * Returns a factory `(container) => WorkflowRunner` so each request gets
 * its own isolated run context with a fresh compensation stack.
 *
 * If any step throws, compensations run in LIFO order (saga pattern).
 * Compensation errors are collected but do not re-throw.
 *
 * @example
 * export const createProjectWorkflow = createWorkflow(
 *   "create-project",
 *   async (input: CreateProjectInput) => {
 *     const project = await createProjectStep(input)
 *     const _ = await logActivityStep({ entity_type: "project", entity_id: project.id })
 *     return new WorkflowResponse(project)
 *   }
 * )
 *
 * // In a route handler:
 * const { result, errors, transaction_status } = await createProjectWorkflow(req.scope).run({ input: req.body })
 */
export function createWorkflow<TInput, TOutput>(
  name: string,
  constructorFn: (input: TInput) => Promise<WorkflowResponse<TOutput>>
): (container: MeridianContainer) => WorkflowRunner<TInput, TOutput> {
  return (container: MeridianContainer): WorkflowRunner<TInput, TOutput> => ({
    async run({ input }: { input: TInput }): Promise<WorkflowResult<TOutput>> {
      const context: WorkflowRunContextStore = {
        container,
        compensationStack: [],
      }

      try {
        const response = await workflowRunContext.run(context, () =>
          constructorFn(input)
        )
        return {
          result: response.output,
          errors: [],
          transaction_status: "done",
        }
      } catch (error) {
        const errors: Error[] = [error as Error]

        // LIFO: run compensations from newest to oldest
        const stack = [...context.compensationStack].reverse()
        for (const compensate of stack) {
          try {
            await compensate()
          } catch (compError) {
            errors.push(compError as Error)
          }
        }

        return {
          result: undefined as unknown as TOutput,
          errors,
          transaction_status: "reverted",
        }
      }
    },
  })
}
