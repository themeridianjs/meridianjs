import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Router, type Express } from "express"
import type { MeridianContainer, ILogger } from "@meridian/types"

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

/**
 * Scans src/api/ recursively for route.ts files and registers them on Express.
 *
 * File path → Express route:
 *   src/api/admin/projects/route.ts       → /admin/projects
 *   src/api/admin/projects/[id]/route.ts  → /admin/projects/:id
 *   src/api/store/products/route.ts       → /store/products
 *
 * Each route.ts exports named HTTP method handlers:
 *   export const GET = async (req, res) => { ... }
 *   export const POST = async (req, res) => { ... }
 */
export async function loadRoutes(
  app: Express,
  container: MeridianContainer,
  apiDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")

  try {
    await fs.access(apiDir)
  } catch {
    logger.debug(`No API directory found at ${apiDir}, skipping route loading.`)
    return
  }

  const router = Router()

  await scanApiDir(router, apiDir, apiDir, logger)

  app.use("/", router)
}

/**
 * Parametric segments like [id] must be registered after literal segments
 * so that e.g. /admin/projects/suggest-identifier matches before /admin/projects/:id.
 */
function sortEntriesForRouteOrder(entries: string[]): string[] {
  return [...entries].sort((a, b) => {
    const aParam = a.startsWith("[") ? 1 : 0
    const bParam = b.startsWith("[") ? 1 : 0
    return aParam - bParam
  })
}

async function scanApiDir(
  router: Router,
  dir: string,
  baseDir: string,
  logger: ILogger
): Promise<void> {
  let entries: string[]

  try {
    entries = await fs.readdir(dir)
  } catch {
    return
  }

  const sorted = sortEntriesForRouteOrder(entries)

  for (const entry of sorted) {
    const fullPath = path.join(dir, entry)
    const stat = await fs.stat(fullPath)

    if (stat.isDirectory()) {
      await scanApiDir(router, fullPath, baseDir, logger)
      continue
    }

    // Only process route.ts / route.js / route.mjs files
    if (!/^route\.(ts|mts|js|mjs|cjs)$/.test(entry)) continue

    const routePath = filePathToRoutePath(fullPath, baseDir)

    let routeModule: Record<string, unknown>
    try {
      routeModule = await import(pathToFileURL(fullPath).href)
    } catch (err: any) {
      logger.error(`Failed to load route file ${fullPath}: ${err.message}`)
      continue
    }

    let registeredCount = 0

    for (const method of HTTP_METHODS) {
      const handler = routeModule[method]
      if (typeof handler !== "function") continue

      const expressMethod = method.toLowerCase() as Lowercase<HttpMethod>

      router[expressMethod](
        routePath,
        async (req: any, res: any, next: any) => {
          try {
            await (handler as Function)(req, res, next)
          } catch (err) {
            next(err)
          }
        }
      )

      registeredCount++
    }

    // Also check for a middlewares export
    const middlewares = routeModule["middlewares"]
    if (Array.isArray(middlewares)) {
      router.use(routePath, ...middlewares)
    }

    if (registeredCount > 0) {
      logger.debug(`Registered route: ${routePath} [${Object.keys(routeModule).filter(k => HTTP_METHODS.includes(k as any)).join(", ")}]`)
    }
  }
}

/**
 * Converts a filesystem path to an Express route path.
 *
 * /abs/src/api/admin/projects/[id]/route.ts → /admin/projects/:id
 */
function filePathToRoutePath(filePath: string, baseDir: string): string {
  const relative = path.relative(baseDir, filePath)
  // Remove the filename (route.ts)
  const withoutFile = relative.replace(/[/\\]?route\.(ts|mts|js|mjs|cjs)$/, "")
  // Normalize to forward slashes
  const normalized = withoutFile.replace(/\\/g, "/")
  // Convert [param] → :param
  const withParams = normalized.replace(/\[(\w+)\]/g, ":$1")
  // Ensure leading slash
  return withParams ? `/${withParams}` : "/"
}
