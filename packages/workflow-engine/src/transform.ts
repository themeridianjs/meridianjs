/**
 * Transforms a step output value using a mapping function.
 * A thin utility to make data transformations explicit in workflow constructors.
 *
 * @example
 * const project = await createProjectStep(input)
 * const activityInput = transform(project, (p) => ({
 *   entity_type: "project" as const,
 *   entity_id: p.id,
 *   workspace_id: p.workspace_id,
 * }))
 * await logActivityStep(activityInput)
 */
export function transform<T, U>(input: T, fn: (value: T) => U): U {
  return fn(input)
}

/**
 * Conditionally executes a step or block of code within a workflow.
 * Returns undefined if the condition is false.
 *
 * @example
 * const notification = await when(
 *   !!input.assignee_id,
 *   () => notifyAssigneeStep({ issue_id: issue.id, assignee_id: input.assignee_id! })
 * )
 */
export async function when<T>(
  condition: boolean,
  fn: () => Promise<T>
): Promise<T | undefined> {
  if (condition) return fn()
  return undefined
}
