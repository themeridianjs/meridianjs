import { createDefaultLoader } from "@meridianjs/framework-utils"
import Notification from "../models/notification.js"

export default createDefaultLoader({
  models: [Notification],
  ormKey: "notificationOrm",
})
