import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import type { Plugin } from "vite"

/**
 * Injects window.__MERIDIAN_CONFIG__ into index.html during Vite dev mode,
 * mirroring what serve-dashboard.ts does in production.
 * Reads VITE_APP_NAME and VITE_LOGO_URL from env (or .env).
 */
function injectMeridianConfig(): Plugin {
  return {
    name: "meridian-config-inject",
    transformIndexHtml: {
      order: "pre",
      handler(_html, ctx) {
        // Only inject during dev; production uses serve-dashboard.ts
        if (!ctx.server) return []
        const config: Record<string, string> = {}
        if (process.env.VITE_APP_NAME) config.appName = process.env.VITE_APP_NAME
        if (process.env.VITE_LOGO_URL) config.logoUrl = process.env.VITE_LOGO_URL
        if (Object.keys(config).length === 0) return []
        return [
          {
            tag: "script",
            children: `window.__MERIDIAN_CONFIG__ = Object.assign(window.__MERIDIAN_CONFIG__ || {}, ${JSON.stringify(config)});`,
            injectTo: "head-prepend",
          },
        ]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), injectMeridianConfig()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-radix": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "vendor-editor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-underline",
            "@tiptap/extension-task-list",
            "@tiptap/extension-task-item",
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/auth": "http://localhost:9000",
      "/admin": "http://localhost:9000",
      "/public": "http://localhost:9000",
      "/uploads": "http://localhost:9000",
    },
  },
})
