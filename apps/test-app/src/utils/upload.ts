import multer from "multer"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { randomUUID } from "node:crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const uploadDir = path.join(rootDir, "uploads", "issue-attachments")

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80)
    cb(null, `${randomUUID()}-${base}${ext}`)
  },
})

/** Multer instance — limits uploads to 50 MB per file. */
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})
