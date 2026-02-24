import { Queue, Worker } from "bullmq"
import IORedis from "ioredis"
import type { IScheduler, ScheduledJobConfig, ModuleDefinition } from "@meridianjs/types"

export interface JobQueueOptions {
  url: string
  /** Prefix for all queue names — defaults to "meridian:job" */
  prefix?: string
}

/**
 * BullMQ-backed scheduler for cron and interval jobs.
 *
 * Each registered job gets its own named queue (`meridian:job:<name>`).
 * BullMQ handles persistence, retries, and scheduling across restarts.
 *
 * Supports:
 *   schedule: "0 2 * * *"           — cron expression (runs daily at 2 AM)
 *   schedule: { interval: 5000 }    — millisecond interval (runs every 5 s)
 *
 * For local development without Redis, jobs are unavailable.
 * Use the scheduler module only when Redis is configured.
 */
export class RedisScheduler implements IScheduler {
  private readonly connection: IORedis
  private readonly prefix: string
  private readonly queues = new Map<string, Queue>()
  private readonly workers = new Map<string, Worker>()

  constructor(options: JobQueueOptions) {
    this.prefix = options.prefix ?? "meridian:job"
    this.connection = new IORedis(options.url, {
      maxRetriesPerRequest: null,
    })
  }

  async register(config: ScheduledJobConfig, fn: () => Promise<void>): Promise<void> {
    const queueName = `${this.prefix}:${config.name}`

    const queue = new Queue(queueName, {
      connection: this.connection as any,
    })

    // Build BullMQ repeat options from the config
    const repeatOpts =
      typeof config.schedule === "string"
        ? { pattern: config.schedule }
        : { every: config.schedule.interval }

    // Remove any existing repeating jobs for this name before re-registering
    // (important on restart — avoids duplicate repeat entries)
    const existingRepeatable = await queue.getRepeatableJobs()
    for (const job of existingRepeatable) {
      await queue.removeRepeatableByKey(job.key)
    }

    await queue.add(
      config.name,
      {},
      {
        repeat: {
          ...repeatOpts,
          ...(config.numberOfExecutions ? { limit: config.numberOfExecutions } : {}),
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )

    const worker = new Worker(
      queueName,
      async () => {
        await fn()
      },
      {
        connection: this.connection as any,
        concurrency: 1, // jobs run sequentially per name
      }
    )

    worker.on("completed", (job) => {
      console.info(`[Scheduler] Job "${config.name}" completed (id: ${job.id})`)
    })

    worker.on("failed", (job, err) => {
      console.error(`[Scheduler] Job "${config.name}" failed:`, err.message)
    })

    this.queues.set(config.name, queue)
    this.workers.set(config.name, worker)
  }

  async close(): Promise<void> {
    await Promise.all([
      ...[...this.workers.values()].map((w) => w.close()),
      ...[...this.queues.values()].map((q) => q.close()),
    ])
    await this.connection.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Meridian module definition for the Redis job scheduler.
 *
 * Register in meridian.config.ts:
 * @example
 * modules: [
 *   { resolve: "@meridianjs/job-queue-redis", options: { url: process.env.REDIS_URL } }
 * ]
 */
const JobQueueRedisModule: ModuleDefinition = {
  key: "scheduler",
  service: RedisScheduler as any,
}

export default JobQueueRedisModule
