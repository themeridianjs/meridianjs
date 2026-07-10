import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type {
  MeridianContainer,
  LinkDefinition,
  ILogger,
  IQuery,
  QueryGraphOptions,
} from "@meridianjs/types"

/**
 * Scans src/links/ for link definition files, registers a LinkService and
 * a Query service in the global container.
 *
 * Link files export a default LinkDefinition created with defineLink().
 */
export async function loadLinks(
  container: MeridianContainer,
  linksDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")
  const definitions: LinkDefinition[] = []

  try {
    await fs.access(linksDir)
  } catch {
    logger.debug(`No links directory at ${linksDir}, skipping.`)
    registerEmptyServices(container)
    return
  }

  const files = await fs.readdir(linksDir)

  for (const file of files) {
    if (/\.d\.(ts|mts)$/.test(file)) continue // skip declaration files
    if (!/\.(ts|mts|js|mjs|cjs)$/.test(file)) continue

    const fullPath = path.join(linksDir, file)
    let mod: Record<string, unknown>

    try {
      mod = await import(pathToFileURL(fullPath).href)
    } catch (err: any) {
      logger.error(`Failed to load link file ${file}: ${err.message}`)
      continue
    }

    const def = mod.default as LinkDefinition | undefined
    if (def?.linkTableName) {
      definitions.push(def)
      logger.debug(`Link loaded: ${def.linkTableName}`)
    }
  }

  // Merge with any link definitions already registered (e.g. from plugins)
  let existingDefs: LinkDefinition[] = []
  try {
    const existingLink = container.resolve("link") as any
    existingDefs = existingLink.getDefinitions?.() ?? []
  } catch {
    // No prior link service — start fresh
  }
  const allDefs = [...existingDefs, ...definitions]

  const linkService = new LinkService(allDefs, container, logger)
  const queryService = new QueryService(allDefs, container, logger)

  container.register({
    link: linkService,
    query: queryService,
  })

  logger.info(`Loaded ${allDefs.length} module link(s)`)
}

function registerEmptyServices(container: MeridianContainer): void {
  const link = new LinkService([], container, null as any)
  const query = new QueryService([], container, null as any)
  container.register({ link, query })
}

// ─────────────────────────────────────────────────────────────────────────────
// Link Service — create/dismiss associations
// ─────────────────────────────────────────────────────────────────────────────

class LinkService {
  private defsByTable: Map<string, LinkDefinition>

  constructor(
    private readonly defs: LinkDefinition[],
    private readonly container: MeridianContainer,
    private readonly logger: ILogger
  ) {
    this.defsByTable = new Map(defs.map((d) => [d.linkTableName, d]))
  }

  async create(
    linkTableName: string,
    _leftId: string,
    _rightId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    // Not yet implemented — throw rather than silently no-op so callers that
    // rely on link persistence fail loudly instead of losing data.
    throw new Error(
      `LinkService.create is not implemented (attempted on "${linkTableName}"). ` +
      `Link persistence is not available in this build.`
    )
  }

  async dismiss(
    linkTableName: string,
    _leftId: string,
    _rightId: string
  ): Promise<void> {
    throw new Error(
      `LinkService.dismiss is not implemented (attempted on "${linkTableName}"). ` +
      `Link persistence is not available in this build.`
    )
  }

  getDefinitions(): LinkDefinition[] {
    return this.defs
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Service — traverse links and fetch related data
// ─────────────────────────────────────────────────────────────────────────────

class QueryService implements IQuery {
  constructor(
    private readonly defs: LinkDefinition[],
    private readonly container: MeridianContainer,
    private readonly logger: ILogger
  ) {}

  async graph<T = unknown>(options: QueryGraphOptions): Promise<{ data: T[] }> {
    // Not yet implemented — throw rather than return an empty result set, which
    // callers would mistake for "no matching data".
    throw new Error(
      `QueryService.graph is not implemented (attempted on "${options.entity}"). ` +
      `Cross-module graph queries are not available in this build.`
    )
  }
}
