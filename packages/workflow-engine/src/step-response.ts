/**
 * Returned by a step's invoke function to provide a separate
 * compensateInput (the data the compensate function receives on rollback).
 *
 * If the invoke function returns a plain value (not a StepResponse),
 * that value is used as both the step output AND the compensate input.
 *
 * @example
 * async function invoke(input, ctx) {
 *   const record = await svc.create(input)
 *   return new StepResponse(record, { id: record.id })  // slim compensate input
 * }
 * async function compensate({ id }, ctx) {
 *   await svc.delete(id)
 * }
 */
export class StepResponse<TOutput, TCompInput = TOutput> {
  constructor(
    public readonly output: TOutput,
    public readonly compensateInput: TCompInput
  ) {}
}
