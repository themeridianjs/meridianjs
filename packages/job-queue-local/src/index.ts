import cron from "node-cron"
import type { IScheduler, ScheduledJobConfig, ModuleDefinition } from "@meridianjs/types"

/**
 * In-process scheduler for local development.
 * Uses node-cron for cron expressions and setInterval for fixed intervals.
 *
 * Not suitable for production (jobs are lost on process restart, no
 * distributed locking). Use @meridianjs/job-queue-redis in production.
 *
 * Switching is a single config change:
 * @example
 * // development
 * { resolve: "@meridianjs/job-queue-local" }
 * // production
 * { resolve: "@meridianjs/job-queue-redis", options: { url: process.env.REDIS_URL } }
 */
export class LocalScheduler implements IScheduler {
  private tasks: cron.ScheduledTask[] = []
  private timers: ReturnType<typeof setInterval>[] = []

  async register(config: ScheduledJobConfig, fn: () => Promise<void>): Promise<void> {
    const safeRun = async () => {
      try {
        await fn()
      } catch (err) {
        console.error(`[LocalScheduler] Job "${config.name}" failed:`, err)
      }
    }

    if (typeof config.schedule === "string") {
      if (!cron.validate(config.schedule)) {
        throw new Error(
          `[LocalScheduler] Invalid cron expression for job "${config.name}": ${config.schedule}`
        )
      }
      const task = cron.schedule(config.schedule, safeRun, { scheduled: true })
      this.tasks.push(task)
    } else {
      const timer = setInterval(safeRun, config.schedule.interval)
      this.timers.push(timer)
    }
  }

  async close(): Promise<void> {
    for (const task of this.tasks) task.stop()
    for (const timer of this.timers) clearInterval(timer)
    this.tasks = []
    this.timers = []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Meridian module definition for the local in-process scheduler.
 *
 * Register in meridian.config.ts:
 * @example
 * modules: [{ resolve: "@meridianjs/job-queue-local" }]
 */
const LocalJobQueueModule: ModuleDefinition = {
  key: "scheduler",
  service: LocalScheduler as any,
}

export default LocalJobQueueModule
