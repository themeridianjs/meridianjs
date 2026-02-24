import path from "node:path"
import http from "node:http"
import type { Express } from "express"
import { createMeridianContainer } from "./container.js"
import { loadConfig } from "./config-loader.js"
import { loadModules } from "./module-loader.js"
import { loadPlugins } from "./plugin-loader.js"
import { loadRoutes } from "./route-loader.js"
import { loadSubscribers } from "./subscriber-loader.js"
import { loadJobs } from "./job-loader.js"
import { loadLinks } from "./link-loader.js"
import { createServer } from "./server.js"
import { ConsoleLogger } from "./logger.js"
import type { MeridianConfig, MeridianContainer, ILogger, IEventBus } from "@meridianjs/types"

export interface BootstrapOptions {
  /** Absolute path to the project root directory */
  rootDir: string
  /** Path to meridian.config.ts — defaults to <rootDir>/meridian.config.ts */
  configPath?: string
}

export interface MeridianApp {
  container: MeridianContainer
  server: Express
  httpServer: http.Server
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Bootstraps a Meridian application.
 *
 * Order of operations:
 *  1. Load meridian.config.ts
 *  2. Create global DI container
 *  3. Register core primitives (logger, config)
 *  4. Load modules from config.modules[]
 *  5. Create Express server (registered before plugins so they can add routes)
 *  6. Apply middlewares from src/api/middlewares.ts
 *  7. Load plugins from config.plugins[]
 *  8. Load module links from src/links/
 *  9. Load file-based API routes from src/api/
 * 10. Load subscribers from src/subscribers/
 * 11. Load scheduled jobs from src/jobs/
 */
export async function bootstrap(opts: BootstrapOptions): Promise<MeridianApp> {
  const { rootDir } = opts

  // ── 1. Load config ─────────────────────────────────────────────────────────
  const config: MeridianConfig = await loadConfig(rootDir, opts.configPath)

  // ── 2. Create global container ─────────────────────────────────────────────
  const container = createMeridianContainer()

  // ── 3. Register core primitives ───────────────────────────────────────────
  const logger: ILogger = new ConsoleLogger("meridian")
  container.register({
    logger,
    config,
  })

  logger.info("Bootstrapping Meridian application...")

  // ── 4. Register infrastructure from modules[] ─────────────────────────────
  // Infrastructure modules (event-bus, job-queue) are declared in config.modules[]
  // just like domain modules — they self-register as "eventBus", "scheduler", etc.
  // Separate them from domain modules by convention (they typically lack loaders).
  await loadModules(container, config.modules ?? [], rootDir)

  // Ensure eventBus is available (fall back to a no-op if not configured)
  let eventBus: IEventBus
  try {
    eventBus = container.resolve<IEventBus>("eventBus")
  } catch {
    logger.warn(
      "No eventBus module registered. Events will not be dispatched. " +
      "Add @meridianjs/event-bus-local or @meridianjs/event-bus-redis to your config.modules."
    )
    eventBus = {
      async emit() {},
      subscribe() {},
      unsubscribe() {},
    }
    container.register({ eventBus: eventBus })
  }

  // ── 5. Create Express server ───────────────────────────────────────────────
  // Must happen before plugins so plugins can register routes against the server.
  const server = createServer(container, config)
  container.register({ server })

  // ── 6. Load API middlewares ────────────────────────────────────────────────
  await loadMiddlewares(server, container, path.join(rootDir, "src", "api"))

  // ── 7. Load plugins ────────────────────────────────────────────────────────
  await loadPlugins(container, config.plugins ?? [], rootDir)

  // ── 8. Load module links ───────────────────────────────────────────────────
  await loadLinks(container, path.join(rootDir, "src", "links"))

  // ── 9. Load file-based API routes ─────────────────────────────────────────
  await loadRoutes(server, container, path.join(rootDir, "src", "api"))

  // ── 10. Load subscribers ──────────────────────────────────────────────────
  await loadSubscribers(container, path.join(rootDir, "src", "subscribers"))

  // ── 11. Load scheduled jobs ───────────────────────────────────────────────
  await loadJobs(container, path.join(rootDir, "src", "jobs"))

  // ── Build HTTP server wrapper ─────────────────────────────────────────────
  const httpServer = http.createServer(server)

  logger.info("Meridian application bootstrapped successfully.")

  return {
    container,
    server,
    httpServer,

    async start() {
      const port = config.projectConfig.httpPort ?? 9000
      await new Promise<void>((resolve, reject) => {
        httpServer.listen(port, () => {
          logger.info(`Meridian server running on http://localhost:${port}`)
          resolve()
        })
        httpServer.on("error", reject)
      })
    },

    async stop() {
      logger.info("Shutting down Meridian server...")
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()))
        })
      }
      try {
        const bus = container.resolve<IEventBus>("eventBus")
        await bus.close?.()
      } catch {
        // eventBus may not have close()
      }
      logger.info("Meridian server stopped.")
    },
  }
}

/**
 * Loads src/api/middlewares.ts and applies its route matchers to the server.
 */
async function loadMiddlewares(
  server: Express,
  container: MeridianContainer,
  apiDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")
  const middlewaresPath = path.join(apiDir, "middlewares.ts")

  let mod: Record<string, unknown>
  try {
    const { pathToFileURL } = await import("node:url")
    mod = await import(pathToFileURL(middlewaresPath).href)
  } catch {
    // middlewares.ts is optional
    return
  }

  const config = mod.default as { routes: Array<{ matcher: string | RegExp; middlewares: any[] }> } | undefined
  if (!config?.routes) return

  for (const route of config.routes) {
    server.use(route.matcher as string, ...route.middlewares)
    logger.debug(`Middleware applied: ${route.matcher}`)
  }
}
