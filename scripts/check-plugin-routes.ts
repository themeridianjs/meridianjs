/**
 * check-plugin-routes.ts
 *
 * Compares route files between apps/test-app/src/api/ and
 * packages/meridian/src/api/. Any route that exists in the test-app
 * but NOT in the plugin is a gap that will cause 404s in scaffolded projects.
 *
 * Usage:
 *   npx tsx scripts/check-plugin-routes.ts
 *
 * Exits with code 1 if gaps are found (suitable for CI / pre-publish hooks).
 */

import { readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

// Routes that only belong in the test-app and should NOT be in the plugin
const TEST_APP_ONLY = new Set([
  "admin/hello/route.ts",
])

function collectRoutes(dir: string): Set<string> {
  const routes = new Set<string>()
  if (!statSync(dir, { throwIfNoEntry: false })) return routes

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        routes.add(path.relative(dir, full).replace(/\.js$/, ".ts"))
      }
    }
  }

  walk(dir)
  return routes
}

const testAppApi = path.join(root, "apps/test-app/src/api")
const pluginApi = path.join(root, "packages/meridian/src/api")

const testRoutes = collectRoutes(testAppApi)
const pluginRoutes = collectRoutes(pluginApi)

const missing: string[] = []
for (const route of testRoutes) {
  if (!TEST_APP_ONLY.has(route) && !pluginRoutes.has(route)) {
    missing.push(route)
  }
}

const pluginOnly: string[] = []
for (const route of pluginRoutes) {
  if (!testRoutes.has(route)) {
    pluginOnly.push(route)
  }
}

let hasProblems = false

if (missing.length > 0) {
  hasProblems = true
  console.error("\n❌  Routes in test-app but MISSING from @meridianjs/meridian:\n")
  for (const r of missing.sort()) {
    console.error(`   ${r}`)
  }
  console.error(
    "\n   These will cause 404s in scaffolded projects. Add them to packages/meridian/src/api/ before publishing.\n"
  )
}

if (pluginOnly.length > 0) {
  // Informational only — plugin can have routes not in test-app (that's fine)
  console.log("\n⚠️   Routes in @meridianjs/meridian but NOT in test-app (informational):\n")
  for (const r of pluginOnly.sort()) {
    console.log(`   ${r}`)
  }
  console.log()
}

if (!hasProblems) {
  console.log("\n✅  All test-app routes are present in @meridianjs/meridian.\n")
  process.exit(0)
} else {
  process.exit(1)
}
