import { createModuleOrm, createRepository, dmlToEntitySchema } from "@meridianjs/framework-utils"
import type { LoaderOptions } from "@meridianjs/types"
import Notification from "../models/notification.js"

const NotificationSchema = dmlToEntitySchema(Notification)

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve("config") as any
  const orm = await createModuleOrm(
    [NotificationSchema],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()
  container.register({
    notificationRepository: createRepository(em, "notification"),
    notificationOrm: orm,
  })
}
