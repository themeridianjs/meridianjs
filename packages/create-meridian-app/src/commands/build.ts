import chalk from "chalk"
import { execa } from "execa"
import { findProjectRoot } from "../utils.js"

export async function runBuild(): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  console.log(chalk.dim("  → Type-checking project..."))
  console.log()

  const result = await execa("npx", ["tsc", "--noEmit"], {
    cwd: rootDir,
    stdio: "inherit",
  }).catch((err: any) => err)

  if (result.exitCode !== 0) {
    console.log()
    console.error(chalk.red("  ✖ Type check failed"))
    process.exit(result.exitCode ?? 1)
  }

  console.log()
  console.log(chalk.green("  ✓ Type check passed"))
}
