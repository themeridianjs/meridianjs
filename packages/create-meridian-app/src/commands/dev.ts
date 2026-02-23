import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { execa } from "execa"
import { findProjectRoot } from "../utils.js"

export async function runDev(): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  const mainTs = path.join(rootDir, "src", "main.ts")
  if (!existsSync(mainTs)) {
    console.error(chalk.red(`  ✖ Entry point not found: ${mainTs}`))
    process.exit(1)
  }

  console.log(chalk.dim(`  → Starting dev server from ${rootDir}`))
  console.log()

  // Run src/main.ts with tsx for TypeScript support + hot reload via chokidar-style restart
  // tsx itself handles ESM + TypeScript; for watch mode we rely on tsx --watch
  const result = await execa(
    "node",
    ["--import", "tsx/esm", mainTs],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? "development",
        FORCE_COLOR: "1",
      },
    }
  ).catch((err: any) => {
    // SIGINT / SIGTERM are normal exits when user presses Ctrl+C
    if (err.signal === "SIGINT" || err.signal === "SIGTERM") {
      process.exit(0)
    }
    throw err
  })

  process.exit(result.exitCode ?? 0)
}
