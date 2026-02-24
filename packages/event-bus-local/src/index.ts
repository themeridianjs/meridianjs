import { EventEmitter } from "node:events"
import type { IEventBus, EventMessage, SubscriberFn, ModuleDefinition } from "@meridianjs/types"

/**
 * Local in-process event bus using Node.js EventEmitter.
 * Suitable for development and single-process deployments.
 *
 * Events are dispatched asynchronously (setImmediate) to avoid
 * blocking the caller while still maintaining ordering guarantees.
 *
 * For production multi-process deployments, use @meridianjs/event-bus-redis.
 */
export class LocalEventBus implements IEventBus {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // Allow many subscribers without NodeJS warnings
    this.emitter.setMaxListeners(500)
  }

  async emit<T>(
    event: EventMessage<T> | EventMessage<T>[]
  ): Promise<void> {
    const events = Array.isArray(event) ? event : [event]

    for (const e of events) {
      // Dispatch asynchronously so the caller is not blocked
      setImmediate(() => {
        this.emitter.emit(e.name, { event: e })
      })
    }
  }

  subscribe(eventName: string, handler: SubscriberFn): void {
    this.emitter.on(eventName, (args: { event: EventMessage }) => {
      Promise.resolve(handler(args as any)).catch((err) => {
        console.error(
          `[LocalEventBus] Unhandled error in subscriber for "${eventName}":`,
          err
        )
      })
    })
  }

  unsubscribe(eventName: string, _handler: SubscriberFn): void {
    // With anonymous wrappers, we remove all listeners for the event.
    // Use @meridianjs/event-bus-redis for fine-grained removal in production.
    this.emitter.removeAllListeners(eventName)
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Definition
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_BUS_MODULE = "eventBus"

/**
 * Meridian module definition for the local event bus.
 *
 * Register in meridian.config.ts:
 * @example
 * modules: [{ resolve: "@meridianjs/event-bus-local" }]
 */
const LocalEventBusModule: ModuleDefinition = {
  key: EVENT_BUS_MODULE,
  // LocalEventBus is both the "service" and the event bus implementation.
  // It takes no constructor args — Awilix PROXY mode handles this cleanly.
  service: LocalEventBus as any,
}

export default LocalEventBusModule
