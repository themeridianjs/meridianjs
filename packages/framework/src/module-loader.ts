import path from "node:path"
import { pathToFileURL } from "node:url"
import type {
  ModuleConfig,
  ModuleDefinition,
  MeridianContainer,
  ILogger,
} from "@meridianjs/types"

/**
 * Loads all modules declared in the config's modules[] array.
 *
 * Each module gets its own isolated child container (Awilix scope).
 * Internal services (e.g. sub-services) remain private to the module.
 * Only the module's main service is promoted to the global container.
 */
export async function loadModules(
  globalContainer: MeridianContainer,
  moduleConfigs: ModuleConfig[],
  rootDir: string
): Promise<void> {
  const logger = globalContainer.resolve<ILogger>("logger")

  for (const moduleConfig of moduleConfigs) {
    const definition = await resolveModuleDefinition(moduleConfig, rootDir)

    logger.info(`Loading module: ${definition.key}`)

    // Each module gets an isolated child scope
    const moduleContainer = globalContainer.createScope()

    // Provide module-level options and logger
    const moduleOptions = moduleConfig.options ?? {}
    moduleContainer.register({
      moduleOptions,
      logger,
    })

    // Run module loaders (DB setup, etc.) in the module's scope
    if (definition.loaders) {
      for (const loader of definition.loaders) {
        await loader({
          container: moduleContainer,
          options: moduleConfig.options,
          logger,
        })
      }
    }

    // Instantiate the module service, passing the module container as first arg.
    // Services should follow the pattern: constructor(container: MeridianContainer).
    const ServiceClass = definition.service
    const serviceInstance = new ServiceClass(moduleContainer)

    // Register the instance in the module container (for internal cross-service use)
    moduleContainer.register({ [definition.key]: serviceInstance })

    // Promote to the global container so routes/workflows/subscribers can resolve it
    globalContainer.register({ [definition.key]: serviceInstance })

    logger.info(`Module loaded: ${definition.key}`)
  }
}

export async function resolveModuleDefinition(
  config: ModuleConfig,
  rootDir: string
): Promise<ModuleDefinition> {
  // Already an instantiated definition object
  if (typeof config.resolve === "object" && config.resolve !== null) {
    return config.resolve as ModuleDefinition
  }

  const resolveStr = config.resolve as string

  // Relative path → resolve from rootDir
  const importPath = resolveStr.startsWith(".")
    ? pathToFileURL(path.resolve(rootDir, resolveStr)).href
    : resolveStr

  const mod = await import(importPath)
  const definition: ModuleDefinition = mod.default ?? mod

  if (!definition?.key || !definition?.service) {
    throw new Error(
      `Module at "${resolveStr}" must export a ModuleDefinition with 'key' and 'service'. ` +
      `Use the Module() helper from @meridianjs/framework-utils.`
    )
  }

  return definition
}
