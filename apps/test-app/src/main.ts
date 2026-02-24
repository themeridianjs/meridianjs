import { bootstrap } from "@meridianjs/framework"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"
import express from "express"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// Ensure uploads directory exists before starting
const uploadsDir = path.join(rootDir, "uploads", "issue-attachments")
fs.mkdirSync(uploadsDir, { recursive: true })

const app = await bootstrap({ rootDir })

// Serve uploaded files statically at /uploads/*
app.server.use("/uploads", express.static(path.join(rootDir, "uploads")))

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
