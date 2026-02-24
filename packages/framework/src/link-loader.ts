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
    leftId: string,
    rightId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    // DB operations deferred to Phase 2 when MikroORM is wired up
    this.logger?.debug(`Link.create: ${linkTableName} ${leftId} → ${rightId}`)
  }

  async dismiss(
    linkTableName: string,
    leftId: string,
    rightId: string
  ): Promise<void> {
    this.logger?.debug(`Link.dismiss: ${linkTableName} ${leftId} → ${rightId}`)
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
    // Full implementation in Phase 2 with DB access
    this.logger?.debug(`Query.graph: ${options.entity}`, { fields: options.fields })
    return { data: [] }
  }
}
