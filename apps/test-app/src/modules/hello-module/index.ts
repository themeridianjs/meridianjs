import { Module, MeridianService, model } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"

// Define a simple model
const Greeting = model.define("greeting", {
  id: model.id().primaryKey(),
  message: model.text(),
  author: model.text().nullable(),
})

// Service class extending the auto-CRUD base
class HelloModuleService extends MeridianService({ Greeting }) {
  constructor(container: MeridianContainer) {
    super(container)
  }

  async sayHello(name: string): Promise<{ greeting: string }> {
    return { greeting: `Hello, ${name}! Welcome to Meridian.` }
  }

  async getStatus(): Promise<{ module: string; status: string; timestamp: string }> {
    return {
      module: "HelloModule",
      status: "active",
      timestamp: new Date().toISOString(),
    }
  }
}

export const HELLO_MODULE = "helloModuleService"

export default Module(HELLO_MODULE, {
  service: HelloModuleService,
  models: [Greeting],
  // No loaders needed for Phase 1 (no DB)
})
