import path from "node:path"
import chalk from "chalk"
import ora from "ora"
import prompts from "prompts"
import { execa } from "execa"
import { findProjectRoot } from "../utils.js"

const ROLES = ["super-admin", "admin", "moderator", "member"] as const
type UserRole = (typeof ROLES)[number]

export async function runUserCreate(opts: {
  email?: string
  role?: UserRole
}): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(
      chalk.red(
        "  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"
      )
    )
    process.exit(1)
  }

  // Validate role flag against allowlist (interactive select already enforces this)
  if (opts.role && !(ROLES as readonly string[]).includes(opts.role)) {
    console.error(chalk.red(`  ✖ Invalid role "${opts.role}". Must be one of: ${ROLES.join(", ")}`))
    process.exit(1)
  }

  // Collect inputs interactively for any that weren't provided via flags
  const response = await prompts(
    [
      {
        type: opts.email ? null : "text",
        name: "email",
        message: "Email address",
        validate: (v: string) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : "Enter a valid email",
      },
      {
        type: "password",
        name: "password",
        message: "Password (min 8 characters)",
        validate: (v: string) =>
          v.length >= 8 ? true : "Password must be at least 8 characters",
      },
      {
        type: "text",
        name: "first_name",
        message: "First name (optional)",
      },
      {
        type: "text",
        name: "last_name",
        message: "Last name (optional)",
      },
      {
        type: opts.role ? null : "select",
        name: "role",
        message: "Role",
        choices: [
          {
            title: "Super Admin",
            value: "super-admin",
            description: "Full control over all settings and users",
          },
          {
            title: "Admin",
            value: "admin",
            description: "Manage projects, members, and content",
          },
          {
            title: "Moderator",
            value: "moderator",
            description: "Manage content and issues",
          },
          {
            title: "Member",
            value: "member",
            description: "Standard access",
          },
        ],
      },
    ],
    {
      onCancel: () => {
        console.log(chalk.yellow("\n  Cancelled."))
        process.exit(0)
      },
    }
  )

  const email: string = opts.email ?? response.email
  const role: UserRole = opts.role ?? response.role
  const password: string = response.password
  const first_name: string = response.first_name ?? ""
  const last_name: string = response.last_name ?? ""

  if (!email || !password || !role) {
    process.exit(0)
  }

  const spinner = ora("Creating user...").start()

  // Password is passed via environment variable so it is never written to disk
  const script = `
import { bootstrap } from "@meridianjs/framework"

const app = await bootstrap({ rootDir: ${JSON.stringify(rootDir)} })
const container = app.container

const authService = container.resolve("authModuleService")

let output
try {
  const result = await authService.register({
    email: ${JSON.stringify(email)},
    password: process.env.MERIDIAN_USER_PASSWORD,
    first_name: ${JSON.stringify(first_name || null)},
    last_name: ${JSON.stringify(last_name || null)},
    role: ${JSON.stringify(role)},
  })
  output = { success: true, user: result.user }
} catch (err) {
  output = { success: false, error: err.message ?? "Failed to create user" }
}

console.log(JSON.stringify(output))
await app.stop()
process.exit(output.success ? 0 : 1)
`

  const { randomBytes } = await import("node:crypto")
  const { tmpdir } = await import("node:os")
  const scriptPath = path.join(tmpdir(), `meridian-user-create-${randomBytes(8).toString("hex")}.mjs`)
  const { writeFile, unlink } = await import("node:fs/promises")
  await writeFile(scriptPath, script, { encoding: "utf-8", mode: 0o600 })

  try {
    const result = await execa("node", ["--import", "tsx/esm", scriptPath], {
      cwd: rootDir,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development", MERIDIAN_USER_PASSWORD: password },
    })

    const lines = result.stdout.trim().split("\n")
    const output = JSON.parse(lines[lines.length - 1])

    if (output.success) {
      spinner.succeed(
        `User created: ${chalk.green(output.user.email)} ` +
          `(${chalk.cyan(role)})`
      )
    } else {
      spinner.fail(output.error ?? "Failed to create user")
      process.exit(1)
    }
  } catch (err: any) {
    spinner.fail("Failed to create user")
    if (err.stdout) {
      try {
        const lines = err.stdout.trim().split("\n")
        const output = JSON.parse(lines[lines.length - 1])
        console.error(chalk.red(`  ${output.error ?? err.stdout}`))
      } catch {
        console.error(chalk.red(`  ${err.stdout}`))
      }
    }
    if (err.stderr) console.error(chalk.red(err.stderr))
    process.exit(1)
  } finally {
    await unlink(scriptPath).catch(() => null)
  }
}
