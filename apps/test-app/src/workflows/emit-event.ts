import { createStep } from "@meridian/workflow-engine"
import type { EventMessage } from "@meridian/types"

/**
 * Shared step that emits a domain event on the event bus.
 * Always the last step in a workflow so it only fires after all
 * business logic succeeds. It has no compensation — events are
 * fire-and-forget (subscribers handle their own idempotency).
 */
export const emitEventStep = createStep(
  "emit-event",
  async (event: EventMessage, { container }) => {
    const eventBus = container.resolve("eventBus") as any
    await eventBus.emit(event)
  }
)
