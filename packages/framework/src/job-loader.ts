import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type {
  MeridianContainer,
  IScheduler,
  ScheduledJobFn,
  ScheduledJobConfig,
  ILogger,
} from "@meridianjs/types"

/**
 * Scans src/jobs/ for scheduled job files and registers them with the scheduler.
 *
 * Each job file must export:
 *   - default: async function(container) { ... }
 *   - config: { name: string, schedule: string | { interval: number } }
 */
export async function loadJobs(
  container: MeridianContainer,
  jobsDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")

  // Scheduler is optional — only present if a scheduler module is registered
  let scheduler: IScheduler | null = null
  try {
    scheduler = container.resolve<IScheduler>("scheduler")
  } catch {
    logger.debug("No scheduler registered, skipping job loading.")
    return
  }

  try {
    await fs.access(jobsDir)
  } catch {
    logger.debug(`No jobs directory at ${jobsDir}, skipping.`)
    return
  }

  const files = await fs.readdir(jobsDir)

  for (const file of files) {
    if (/\.d\.(ts|mts)$/.test(file)) continue // skip declaration files
    if (!/\.(ts|mts|js|mjs|cjs)$/.test(file)) continue

    const fullPath = path.join(jobsDir, file)
    let mod: Record<string, unknown>

    try {
      mod = await import(pathToFileURL(fullPath).href)
    } catch (err: any) {
      logger.error(`Failed to load job ${file}: ${err.message}`)
      continue
    }

    const fn = mod.default as ScheduledJobFn | undefined
    const config = mod.config as ScheduledJobConfig | undefined

    if (typeof fn !== "function") {
      logger.warn(`Job ${file} is missing a default export function.`)
      continue
    }

    if (!config?.name || !config?.schedule) {
      logger.warn(`Job ${file} is missing a valid config export.`)
      continue
    }

    await scheduler.register(config, () => fn(container))
    logger.info(`Scheduled job registered: ${config.name} (${JSON.stringify(config.schedule)})`)
  }
}
