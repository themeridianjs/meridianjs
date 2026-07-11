import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/api/mcp/route.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  outDir: "dist",
  // Preserve the src/ directory structure inside dist/
  outExtension: () => ({ js: ".js" }),
})
