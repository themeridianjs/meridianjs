import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Tells the Meridian plugin loader where to find this package's
 * api/, links/, subscribers/, and jobs/ directories.
 *
 * Points to the package root so the loader can probe dist/ (production)
 * or src/ (tsx dev mode) automatically.
 */
export const pluginRoot = path.resolve(__dirname, "..")
