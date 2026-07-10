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
  /** Maps each user handler to the wrapper registered on the emitter, per event. */
  private wrappers = new Map<string, Map<SubscriberFn, (args: any) => void>>()

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
    let forEvent = this.wrappers.get(eventName)
    if (!forEvent) {
      forEvent = new Map()
      this.wrappers.set(eventName, forEvent)
    }
    // Dedup: subscribing the same handler twice (e.g. hot reload) is a no-op.
    if (forEvent.has(handler)) return

    const wrapper = (args: { event: EventMessage }) => {
      Promise.resolve(handler(args as any)).catch((err) => {
        console.error(
          `[LocalEventBus] Unhandled error in subscriber for "${eventName}":`,
          err
        )
      })
    }
    forEvent.set(handler, wrapper)
    this.emitter.on(eventName, wrapper)
  }

  unsubscribe(eventName: string, handler: SubscriberFn): void {
    const forEvent = this.wrappers.get(eventName)
    const wrapper = forEvent?.get(handler)
    if (wrapper) {
      this.emitter.removeListener(eventName, wrapper)
      forEvent!.delete(handler)
      if (forEvent!.size === 0) this.wrappers.delete(eventName)
    }
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners()
    this.wrappers.clear()
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
