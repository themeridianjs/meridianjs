import { Module } from "@meridian/framework-utils"
import { NotificationModuleService } from "./service.js"
import defaultLoader from "./loaders/default.js"

export { NotificationModuleService }

export default Module("notificationModuleService", {
  service: NotificationModuleService,
  loaders: [defaultLoader],
  linkable: {
    notification: { tableName: "notification", primaryKey: "id" },
  },
})
