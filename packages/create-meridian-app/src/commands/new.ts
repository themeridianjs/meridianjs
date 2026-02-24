import path from "node:path"
import { existsSync } from "node:fs"
import ora from "ora"
import chalk from "chalk"
import prompts from "prompts"
import { execa } from "execa"
import {
  renderPackageJson,
  renderTsConfig,
  renderMeridianConfig,
  renderMainTs,
  renderMiddlewares,
  renderHelloRoute,
  renderGitIgnore,
  renderEnvExample,
  renderReadme,
} from "../templates/index.js"
import { writeFile, mkdirWithKeep } from "../utils.js"

export async function runNew(projectName?: string): Promise<void> {
  console.log()
  console.log(chalk.bold("  Create Meridian App"))
  console.log()

  // ── 1. Prompt for project name if not provided ──────────────────────────
  let name = projectName
  if (!name) {
    const res = await prompts(
      {
        type: "text",
        name: "name",
        message: "Project name",
        initial: "my-meridian-app",
        validate: (v: string) =>
          /^[a-z0-9-_]+$/.test(v) || "Use lowercase letters, numbers, hyphens, and underscores only",
      },
      { onCancel: () => process.exit(0) }
    )
    name = res.name as string
  }

  // ── 2. Validate target directory ────────────────────────────────────────
  const targetDir = path.resolve(process.cwd(), name)
  if (existsSync(targetDir)) {
    const { overwrite } = await prompts(
      {
        type: "confirm",
        name: "overwrite",
        message: `Directory "${name}" already exists. Continue anyway?`,
        initial: false,
      },
      { onCancel: () => process.exit(0) }
    )
    if (!overwrite) {
      console.log(chalk.yellow("  Cancelled."))
      process.exit(0)
    }
  }

  // ── 3. Collect project config via prompts ───────────────────────────────
  const answers = await prompts(
    [
      {
        type: "text",
        name: "databaseUrl",
        message: "Database URL",
        initial: `postgresql://postgres:postgres@localhost:5432/${name}`,
      },
      {
        type: "number",
        name: "httpPort",
        message: "HTTP port",
        initial: 9000,
      },
      {
        type: "confirm",
        name: "dashboard",
        message: "Install admin dashboard?",
        initial: true,
      },
      {
        type: "confirm",
        name: "installDeps",
        message: "Install dependencies now?",
        initial: true,
      },
    ],
    { onCancel: () => process.exit(0) }
  )

  const vars = {
    name,
    databaseUrl: answers.databaseUrl as string,
    httpPort: answers.httpPort as number,
    dashboard: answers.dashboard as boolean,
  }

  // ── 4. Scaffold files ───────────────────────────────────────────────────
  const spinner = ora("Scaffolding project...").start()

  try {
    // Root files
    await writeFile(path.join(targetDir, "package.json"), renderPackageJson(vars))
    await writeFile(path.join(targetDir, "tsconfig.json"), renderTsConfig())
    await writeFile(path.join(targetDir, "meridian.config.ts"), renderMeridianConfig(vars))
    await writeFile(path.join(targetDir, ".gitignore"), renderGitIgnore())
    await writeFile(path.join(targetDir, ".env.example"), renderEnvExample(vars))
    await writeFile(path.join(targetDir, "README.md"), renderReadme(vars))

    // src/main.ts
    await writeFile(path.join(targetDir, "src", "main.ts"), renderMainTs())

    // src/api/middlewares.ts
    await writeFile(path.join(targetDir, "src", "api", "middlewares.ts"), renderMiddlewares())

    // src/api/admin/hello/route.ts — starter route
    await writeFile(
      path.join(targetDir, "src", "api", "admin", "hello", "route.ts"),
      renderHelloRoute()
    )

    // Empty directories for user's code
    await mkdirWithKeep(path.join(targetDir, "src", "modules"))
    await mkdirWithKeep(path.join(targetDir, "src", "workflows"))
    await mkdirWithKeep(path.join(targetDir, "src", "subscribers"))
    await mkdirWithKeep(path.join(targetDir, "src", "jobs"))
    await mkdirWithKeep(path.join(targetDir, "src", "links"))

    spinner.succeed("Scaffolded project files")
  } catch (err) {
    spinner.fail("Failed to scaffold project files")
    throw err
  }

  // ── 5. Install dependencies ─────────────────────────────────────────────
  if (answers.installDeps) {
    const installSpinner = ora("Installing dependencies...").start()
    try {
      await execa("npm", ["install"], { cwd: targetDir, stdio: "pipe" })
      installSpinner.succeed("Dependencies installed")
    } catch (err) {
      installSpinner.warn("npm install failed — run it manually")
    }
  }

  // ── 6. Success message ──────────────────────────────────────────────────
  console.log()
  console.log(chalk.green("  ✓ Project created!"))
  console.log()
  console.log(`  ${chalk.dim("cd")} ${chalk.cyan(name)}`)
  if (!answers.installDeps) {
    console.log(`  ${chalk.dim("npm install")}`)
  }
  console.log(`  ${chalk.dim("cp")} .env.example .env ${chalk.dim("# fill in your DATABASE_URL")}`)
  console.log(`  ${chalk.cyan("npm run db:migrate")}`)
  console.log(`  ${chalk.cyan("npm run dev")}`)
  console.log()
}
