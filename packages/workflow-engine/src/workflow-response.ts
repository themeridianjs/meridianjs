/**
 * Wraps the final return value of a workflow constructor function.
 * The `output` becomes the `result` of the workflow run.
 *
 * @example
 * createWorkflow("create-project", async (input) => {
 *   const project = await createProjectStep(input)
 *   return new WorkflowResponse(project)
 * })
 */
export class WorkflowResponse<T> {
  constructor(public readonly output: T) {}
}
