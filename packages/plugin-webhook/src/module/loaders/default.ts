import { createModuleOrm, createRepository, dmlToEntitySchema } from "@meridian/framework-utils"
import type { LoaderOptions } from "@meridian/types"
import { WebhookEvent } from "../models/webhook-event.js"

const WebhookEventSchema = dmlToEntitySchema(WebhookEvent)

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve("config") as any
  const orm = await createModuleOrm(
    [WebhookEventSchema],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()
  container.register({
    webhookEventRepository: createRepository(em, "webhook_event"),
    webhookEventOrm: orm,
  })
}
