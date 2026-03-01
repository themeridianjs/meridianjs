import { Module } from "@meridianjs/framework-utils"
import { S3StorageService } from "./service.js"

export type { S3StorageOptions } from "./types.js"
export { S3StorageService } from "./service.js"

export default Module("storageProvider", {
  service: S3StorageService,
})
