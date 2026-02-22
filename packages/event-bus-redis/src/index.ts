import { Queue, Worker } from "bullmq"
import IORedis from "ioredis"
import type {
  IEventBus,
  EventMessage,
  SubscriberFn,
  ModuleDefinition,
} from "@meridian/types"

export interface RedisEventBusOptions {
  url: string
  /** BullMQ queue name — defaults to "meridian:events" */
  queueName?: string
  /** Worker concurrency — defaults to 5 */
  concurrency?: number
}

/**
 * Production event bus backed by BullMQ + Redis.
 *
 * All events go into a single persistent BullMQ queue.
 * A Worker processes jobs and fans out to all registered handlers for
 * the event name — providing durable, async, at-least-once delivery.
 *
 * For local development use @meridian/event-bus-local instead.
 */
export class RedisEventBus implements IEventBus {
  private queue: Queue
  private worker: Worker
  private connection: IORedis
  /** event name → set of registered handlers */
  private handlers = new Map<string, Set<SubscriberFn>>()

  constructor(options: RedisEventBusOptions) {
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
        if (!handlers || handlers.size === 0) return

        await Promise.all(
          [...handlers].map((handler) =>
            handler({ event: eventMsg, container: null as any }).catch((err) => {
              console.error(
                `[RedisEventBus] Unhandled error in subscriber for "${eventMsg.name}":`,
                err
              )
            })
          )
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
 *   { resolve: "@meridian/event-bus-redis", options: { url: process.env.REDIS_URL } }
 * ]
 */
const RedisEventBusModule: ModuleDefinition = {
  key: EVENT_BUS_MODULE,
  service: RedisEventBus as any,
}

export default RedisEventBusModule
