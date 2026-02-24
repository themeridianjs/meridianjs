import { Module } from "@meridianjs/framework-utils"
import { WebhookModuleService } from "./service.js"
import { WebhookEvent } from "./models/webhook-event.js"
import defaultLoader from "./loaders/default.js"

export const WebhookModule = Module("webhookModuleService", {
  service: WebhookModuleService,
  models: [WebhookEvent],
  loaders: [defaultLoader],
  linkable: {
    webhookEvent: { tableName: "webhook_event", primaryKey: "id" },
  },
})
