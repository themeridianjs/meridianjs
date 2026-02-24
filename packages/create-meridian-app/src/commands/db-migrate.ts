import path from "node:path"
import chalk from "chalk"
import ora from "ora"
import { execa } from "execa"
import { findProjectRoot } from "../utils.js"

export async function runDbMigrate(): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  const spinner = ora("Synchronizing database schema...").start()

  // Run a small inline script that bootstraps the app (which triggers schema
  // sync in each module's loader) and then exits without starting the HTTP server.
  const script = `
import { bootstrap } from "@meridianjs/framework"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = await bootstrap({ rootDir: ${JSON.stringify(rootDir)} })
// Schema sync already ran during module loading above.
// Don't start the HTTP server — just close all connections.
await app.stop()
process.exit(0)
`

  const scriptPath = path.join(rootDir, ".meridian-migrate-tmp.mjs")

  // Write temp script to disk and run it with tsx
  const { writeFile, unlink } = await import("node:fs/promises")
  await writeFile(scriptPath, script, "utf-8")

  try {
    await execa("node", ["--import", "tsx/esm", scriptPath], {
      cwd: rootDir,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development" },
    })
    spinner.succeed("Database schema synchronized")
  } catch (err: any) {
    spinner.fail("Schema migration failed")
    console.error()
    if (err.stderr) console.error(chalk.red(err.stderr))
    if (err.stdout) console.error(err.stdout)
    process.exit(1)
  } finally {
    await unlink(scriptPath).catch(() => null)
  }
}
