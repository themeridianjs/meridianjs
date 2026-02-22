import {
  createContainer,
  asValue,
  asClass,
  asFunction,
  InjectionMode,
  type AwilixContainer,
  type Resolver,
} from "awilix"
import type { MeridianContainer } from "@meridian/types"

/**
 * Wraps an Awilix container into a MeridianContainer.
 * Uses PROXY injection mode so services receive their dependencies
 * as named properties from the container — no decorators required.
 */
function wrapContainer(raw: AwilixContainer): MeridianContainer {
  const container: MeridianContainer = {
    resolve<T = unknown>(token: string): T {
      return raw.resolve<T>(token)
    },

    register(registrations: Record<string, unknown>): void {
      const awilixRegs: Record<string, Resolver<unknown>> = {}

      for (const [key, value] of Object.entries(registrations)) {
        if (value === null || value === undefined) {
          awilixRegs[key] = asValue(value)
        } else if (
          typeof value === "function" &&
          value.prototype &&
          Object.getOwnPropertyNames(value.prototype).length > 1
        ) {
          // Class with prototype methods → register as class singleton
          awilixRegs[key] = asClass(value as any, { lifetime: "SINGLETON" })
        } else if (typeof value === "function") {
          // Plain function → register as function singleton
          awilixRegs[key] = asFunction(value as any, { lifetime: "SINGLETON" })
        } else {
          // Primitive, object, or pre-instantiated value
          awilixRegs[key] = asValue(value)
        }
      }

      raw.register(awilixRegs)
    },

    createScope(): MeridianContainer {
      return wrapContainer(raw.createScope())
    },
  }

  return container
}

export function createMeridianContainer(): MeridianContainer {
  const raw = createContainer({
    injectionMode: InjectionMode.PROXY,
    strict: false,
  })

  return wrapContainer(raw)
}

export { asValue, asClass, asFunction }
