import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { renderRoute } from "../../templates/index.js"
import { writeFile, findProjectRoot } from "../../utils.js"

const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

export async function generateRoute(routePath: string, methods: string[]): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!routePath) {
    console.error(chalk.red("  ✖ Route path is required. Usage: meridian generate route <path>"))
    process.exit(1)
  }

  // Normalize: strip leading slash, ensure it maps to src/api/<path>/route.ts
  const normalized = routePath.replace(/^\//, "")
  const filePath = path.join(rootDir, "src", "api", normalized, "route.ts")

  // Guard against path traversal (e.g. ../../package.json/evil)
  const resolvedFile = path.resolve(filePath)
  const resolvedBase = path.resolve(rootDir, "src", "api")
  if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
    console.error(chalk.red("  ✖ Invalid route path: must resolve within src/api/"))
    process.exit(1)
  }

  if (existsSync(filePath)) {
    console.error(chalk.red(`  ✖ Route already exists: src/api/${normalized}/route.ts`))
    process.exit(1)
  }

  const normalizedMethods = methods.map((m) => m.toUpperCase())
  const invalid = normalizedMethods.filter((m) => !VALID_METHODS.includes(m))
  if (invalid.length > 0) {
    console.error(chalk.red(`  ✖ Invalid HTTP methods: ${invalid.join(", ")}. Valid: ${VALID_METHODS.join(", ")}`))
    process.exit(1)
  }

  await writeFile(filePath, renderRoute(normalizedMethods))

  console.log(chalk.green(`  ✓ Generated route: src/api/${normalized}/route.ts`))
  console.log()
  console.log("  Handlers exported:")
  for (const m of normalizedMethods) {
    console.log(chalk.dim(`    ${m} /${normalized}`))
  }
  console.log()
  console.log("  The route is auto-loaded by the framework on next dev restart.")
}
