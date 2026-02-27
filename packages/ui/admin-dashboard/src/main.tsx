import React, { StrictMode } from "react"
import * as ReactJsxRuntime from "react/jsx-runtime"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { AuthProvider } from "@/stores/auth"
import { CommandPaletteProvider } from "@/stores/command-palette"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WidgetRegistryProvider } from "@/lib/widget-registry"
import type { AnyWidgetDefinition } from "@/lib/widget-registry"
import widgets from "@/extensions/widgets"
import { App } from "./App"
import "./index.css"

// Expose React for extension bundles compiled and loaded at runtime by
// `meridian serve-dashboard`. The esbuild plugin in serve-dashboard.ts
// rewrites `import React from 'react'` to read from these window globals,
// so the pre-built dashboard and user extensions share the same React instance.
;(window as any).__React = React
;(window as any).__ReactJsxRuntime = ReactJsxRuntime

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
})

// Load user-defined admin extensions (served by `meridian serve-dashboard`)
// then render. Wrapped in an async IIFE to avoid top-level await, which is
// not available in the Vite build target.
;(async () => {
  let externalWidgets: AnyWidgetDefinition[] = []
  try {
    // Use a variable so TypeScript doesn't try to statically resolve the path.
    // The file is served at runtime by `meridian serve-dashboard`.
    const extUrl: string = "/admin-extensions.js"
    const mod = await import(/* @vite-ignore */ extUrl)
    if (Array.isArray(mod?.default)) {
      externalWidgets = mod.default as AnyWidgetDefinition[]
    }
  } catch {
    // No external extensions — normal in vite dev mode
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <WidgetRegistryProvider widgets={[...widgets, ...externalWidgets]}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CommandPaletteProvider>
              <BrowserRouter>
                <TooltipProvider delayDuration={300}>
                  <App />
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      classNames: {
                        toast:
                          "bg-white dark:bg-card border border-border text-foreground text-sm rounded-lg shadow-sm",
                        description: "text-muted-foreground",
                      },
                    }}
                  />
                </TooltipProvider>
              </BrowserRouter>
            </CommandPaletteProvider>
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
      </WidgetRegistryProvider>
    </StrictMode>
  )
})()
