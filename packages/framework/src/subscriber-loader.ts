import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type {
  MeridianContainer,
  IEventBus,
  SubscriberFn,
  SubscriberConfig,
  ILogger,
} from "@meridian/types"

/**
 * Scans src/subscribers/ for subscriber files and registers them on the event bus.
 *
 * Each subscriber file must export:
 *   - default: async function handler({ event, container }) { ... }
 *   - config: { event: "event.name" | string[] }
 */
export async function loadSubscribers(
  container: MeridianContainer,
  subscribersDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")

  try {
    await fs.access(subscribersDir)
  } catch {
    logger.debug(`No subscribers directory at ${subscribersDir}, skipping.`)
    return
  }

  const eventBus = container.resolve<IEventBus>("eventBus")
  const files = await fs.readdir(subscribersDir)

  for (const file of files) {
    if (!/\.(ts|mts|js|mjs|cjs)$/.test(file)) continue

    const fullPath = path.join(subscribersDir, file)
    let mod: Record<string, unknown>

    try {
      mod = await import(pathToFileURL(fullPath).href)
    } catch (err: any) {
      logger.error(`Failed to load subscriber ${file}: ${err.message}`)
      continue
    }

    const handler = mod.default as SubscriberFn | undefined
    const config = mod.config as SubscriberConfig | undefined

    if (typeof handler !== "function") {
      logger.warn(`Subscriber ${file} is missing a default export function.`)
      continue
    }

    if (!config?.event) {
      logger.warn(`Subscriber ${file} is missing a config.event export.`)
      continue
    }

    const events = Array.isArray(config.event) ? config.event : [config.event]

    for (const eventName of events) {
      eventBus.subscribe(eventName, (args) =>
        handler({ ...args, container })
      )
      logger.debug(`Subscriber registered: ${file} → ${eventName}`)
    }
  }
}
