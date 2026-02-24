import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { writeFile, toPascalCase, toKebabCase, findProjectRoot } from "../../utils.js"

function renderPluginIndex(_name: string, pascalName: string): string {
  return `import { fileURLToPath } from "node:url"
import path from "node:path"
import type { PluginRegistrationContext } from "@meridianjs/types"

/**
 * The compiled directory of this plugin.
 * The Meridian plugin-loader uses this to auto-scan api/, subscribers/, jobs/.
 */
export const pluginRoot: string = path.dirname(fileURLToPath(import.meta.url))

/**
 * Called during bootstrap before route/subscriber auto-scan.
 * Use ctx.addModule() to register domain modules.
 */
export default async function register(_ctx: PluginRegistrationContext): Promise<void> {
  // Example: register a custom module
  // await ctx.addModule({ resolve: My${pascalName}Module })
}
`
}

function renderPluginRoute(name: string): string {
  return `import type { Response } from "express"

/**
 * GET /admin/${name}
 * Example plugin admin route.
 */
export const GET = async (req: any, res: Response) => {
  res.json({ plugin: "${name}", status: "active" })
}
`
}

export async function generatePlugin(name: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!name) {
    console.error(chalk.red("  ✖ Plugin name is required. Usage: meridian generate plugin <name>"))
    process.exit(1)
  }

  const kebab = toKebabCase(name)
  const pascal = toPascalCase(kebab)

  const pluginDir = path.join(rootDir, "src", "plugins", kebab)

  if (existsSync(pluginDir)) {
    console.error(chalk.red(`  ✖ Plugin directory already exists: src/plugins/${kebab}`))
    process.exit(1)
  }

  await writeFile(path.join(pluginDir, "index.ts"), renderPluginIndex(kebab, pascal))
  await writeFile(
    path.join(pluginDir, "api", "admin", kebab, "route.ts"),
    renderPluginRoute(kebab)
  )

  console.log(chalk.green(`  ✓ Generated plugin: src/plugins/${kebab}/`))
  console.log()
  console.log("  Files created:")
  console.log(chalk.dim(`    src/plugins/${kebab}/index.ts`))
  console.log(chalk.dim(`    src/plugins/${kebab}/api/admin/${kebab}/route.ts`))
  console.log()
  console.log("  Next steps:")
  console.log(chalk.dim(`    1. Add the plugin to your meridian.config.ts:`))
  console.log(chalk.dim(`       plugins: [{ resolve: "./src/plugins/${kebab}" }]`))
  console.log(chalk.dim(`    2. Start the dev server: \`npm run dev\``))
}
