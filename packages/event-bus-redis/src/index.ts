import { Queue, Worker } from "bullmq"
import IORedis from "ioredis"
import type {
  IEventBus,
  EventMessage,
  SubscriberFn,
  ModuleDefinition,
} from "@meridianjs/types"

export interface RedisEventBusOptions {
  url: string
  /** BullMQ queue name — defaults to "meridian:events" */
  queueName?: string
  /** Worker concurrency — defaults to 5 */
  concurrency?: number
}

/**
 * Thrown when a job's event has no handler in this process. Causes BullMQ to
 * retry (and eventually park the job in the failed set) rather than silently
 * marking it complete.
 *
 * NOTE: this bus assumes a HOMOGENEOUS deployment — every process loads every
 * subscriber. Heterogeneous worker pools that split subscribers across
 * processes should move to per-event queue names (see README).
 */
export class UnhandledEventError extends Error {
  constructor(eventName: string) {
    super(`No subscriber registered in this process for event "${eventName}"`)
    this.name = "UnhandledEventError"
  }
}

/**
 * Resolves options whether the class was constructed directly with an options
 * object or by the Meridian module loader with (container, moduleOptions).
 */
function resolveOptions<T>(containerOrOptions: any, moduleOptions?: T): T | undefined {
  if (moduleOptions && Object.keys(moduleOptions).length > 0) return moduleOptions
  if (typeof containerOrOptions?.resolve === "function") {
    try {
      return containerOrOptions.resolve("moduleOptions") as T
    } catch {
      return undefined
    }
  }
  return containerOrOptions as T
}

/**
 * Production event bus backed by BullMQ + Redis.
 *
 * All events go into a single persistent BullMQ queue.
 * A Worker processes jobs and fans out to all registered handlers for
 * the event name — providing durable, async, at-least-once delivery.
 *
 * For local development use @meridianjs/event-bus-local instead.
 */
export class RedisEventBus implements IEventBus {
  private queue: Queue
  private worker: Worker
  private connection: IORedis
  /** event name → set of registered handlers */
  private handlers = new Map<string, Set<SubscriberFn>>()

  /**
   * Accepts either the options object directly (`new RedisEventBus({ url })`)
   * or, when loaded as a Meridian module, the module container as first arg
   * and the module's config options as second.
   */
  constructor(containerOrOptions: any, moduleOptions?: RedisEventBusOptions) {
    const options = resolveOptions<RedisEventBusOptions>(containerOrOptions, moduleOptions)

    if (!options?.url) {
      throw new Error(
        "@meridianjs/event-bus-redis: missing required option 'url'. " +
        "Set it in meridian.config.ts: " +
        `{ resolve: "@meridianjs/event-bus-redis", options: { url: process.env.REDIS_URL } }`
      )
    }

    const queueName = options.queueName ?? "meridian:events"

    // ioredis connection shared between queue and worker
    this.connection = new IORedis(options.url, {
      maxRetriesPerRequest: null,
    })

    this.queue = new Queue(queueName, {
      connection: this.connection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    })

    this.worker = new Worker(
      queueName,
      async (job) => {
        const eventMsg = job.data as EventMessage
        const handlers = this.handlers.get(eventMsg.name)
        if (!handlers || handlers.size === 0) {
          // No handler in THIS process. In a homogeneous deployment every
          // process registers every subscriber, so this only happens for a
          // genuinely unhandled event or a heterogeneous rollout. Throw so
          // BullMQ retries (a retry may land on a process that can handle it)
          // and the job ends up in the failed set — never silently completed.
          throw new UnhandledEventError(eventMsg.name)
        }

        // A subscriber that throws must fail the job (BullMQ retry), so do NOT
        // swallow errors here. The container is injected by the subscriber
        // loader's wrapper — the bus only supplies the event.
        await Promise.all(
          [...handlers].map((handler) => handler({ event: eventMsg } as any))
        )
      },
      {
        connection: this.connection as any,
        concurrency: options.concurrency ?? 5,
      }
    )

    this.worker.on("error", (err) => {
      console.error("[RedisEventBus] Worker error:", err)
    })

    this.worker.on("failed", (job, err) => {
      console.error(
        `[RedisEventBus] Job failed for event "${job?.data?.name ?? "unknown"}" ` +
        `(attempt ${job?.attemptsMade}):`,
        err?.message ?? err
      )
    })
  }

  async emit<T>(event: EventMessage<T> | EventMessage<T>[]): Promise<void> {
    const events = Array.isArray(event) ? event : [event]
    await Promise.all(
      events.map((e) => this.queue.add(e.name, e))
    )
  }

  subscribe(eventName: string, handler: SubscriberFn): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set())
    }
    this.handlers.get(eventName)!.add(handler)
  }

  unsubscribe(eventName: string, handler: SubscriberFn): void {
    this.handlers.get(eventName)?.delete(handler)
  }

  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
    await this.connection.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Definition
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_BUS_MODULE = "eventBus"

/**
 * Meridian module definition for the Redis event bus.
 *
 * Register in meridian.config.ts:
 * @example
 * modules: [
 *   { resolve: "@meridianjs/event-bus-redis", options: { url: process.env.REDIS_URL } }
 * ]
 */
const RedisEventBusModule: ModuleDefinition = {
  key: EVENT_BUS_MODULE,
  service: RedisEventBus as any,
}

export default RedisEventBusModule
