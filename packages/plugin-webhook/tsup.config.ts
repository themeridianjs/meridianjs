import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/api/webhooks/[provider]/route.ts",
    "src/api/admin/webhooks/route.ts",
    "src/subscribers/webhook-received.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  outDir: "dist",
  // Preserve the src/ directory structure inside dist/
  outExtension: () => ({ js: ".js" }),
})
