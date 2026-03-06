import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { execa } from "execa"
import dotenv from "dotenv"
import { findProjectRoot, readProjectPorts } from "../utils.js"
import { startDashboardServer, buildAdminExtensions } from "./serve-dashboard.js"

export async function runDev(): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  dotenv.config({ path: path.join(rootDir, ".env") })

  const mainTs = path.join(rootDir, "src", "main.ts")
  if (!existsSync(mainTs)) {
    console.error(chalk.red(`  ✖ Entry point not found: ${mainTs}`))
    process.exit(1)
  }

  const dashboardDist = path.join(rootDir, "node_modules", "@meridianjs", "admin-dashboard", "dist")
  const hasDashboard = existsSync(dashboardDist)

  // Read ports from meridian.config.ts (falls back to 9000 / 5174)
  const { apiPort, dashboardPort } = await readProjectPorts(rootDir)
  const apiUrl = process.env.API_URL ?? `http://localhost:${apiPort}`

  let dashServer: import("node:http").Server | null = null
  if (hasDashboard) {
    // Compile user-defined admin extensions if present
    let adminExtensionsBuf: Buffer | null = null
    const extensionsEntry = path.join(rootDir, "src", "admin", "widgets", "index.tsx")
    if (existsSync(extensionsEntry)) {
      try {
        adminExtensionsBuf = await buildAdminExtensions(rootDir)
        console.log(chalk.green("  ✔ Admin extensions compiled"))
      } catch (err) {
        console.warn(chalk.yellow("  ⚠ Admin extensions failed to compile:"), err)
      }
    }

    dashServer = await startDashboardServer(dashboardDist, dashboardPort, apiPort, "localhost", adminExtensionsBuf, apiUrl)
    console.log(
      chalk.dim("  → API: ") + chalk.cyan(`http://localhost:${apiPort}`) +
      chalk.dim("  dashboard: ") + chalk.cyan(`http://localhost:${dashboardPort}`)
    )
  } else {
    console.log(chalk.dim(`  → API: http://localhost:${apiPort}`))
  }
  console.log()

  const apiProc = execa(
    "node",
    ["--import", "tsx/esm", mainTs],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development", FORCE_COLOR: "1" },
    }
  )

  const shutdown = (signal: NodeJS.Signals) => {
    dashServer?.close()
    apiProc.kill(signal)
    process.exit(0)
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  await apiProc.catch((err: any) => {
    if (err.signal === "SIGINT" || err.signal === "SIGTERM") {
      dashServer?.close()
      process.exit(0)
    }
    throw err
  })

  dashServer?.close()
  process.exit(apiProc.exitCode ?? 0)
}
