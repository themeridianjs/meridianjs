import { bootstrap } from "@meridian/framework"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const app = await bootstrap({ rootDir })
await app.start()

// Graceful shutdown
process.on("SIGTERM", async () => {
  await app.stop()
  process.exit(0)
})

process.on("SIGINT", async () => {
  await app.stop()
  process.exit(0)
})
