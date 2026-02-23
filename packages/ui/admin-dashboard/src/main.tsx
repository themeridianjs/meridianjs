import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { AuthProvider } from "@/stores/auth"
import { CommandPaletteProvider } from "@/stores/command-palette"
import { TooltipProvider } from "@/components/ui/tooltip"
import { App } from "./App"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>
)
