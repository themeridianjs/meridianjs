import { createStep } from "@meridianjs/workflow-engine"
import type { EventMessage } from "@meridianjs/types"

export const emitEventStep = createStep(
  "emit-event",
  async (event: EventMessage, { container }) => {
    const eventBus = container.resolve("eventBus") as any
    await eventBus.emit(event)
  }
)
