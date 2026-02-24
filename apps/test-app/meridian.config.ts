import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://arjusmoon@localhost:5432/meridian_test",
    jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-for-testing-only",
    httpPort: 9000,
  },
  modules: [
    // Infrastructure (optional — swap for @meridianjs/event-bus-redis in production)
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
    // Local test module (Phase 1 smoke test)
    { resolve: "./src/modules/hello-module/index.ts" },
    // Core domain modules are automatically loaded by the @meridianjs/meridian plugin
  ],
  plugins: [
    // Default meridian routes/workflows/links/subscribers
    { resolve: "@meridianjs/meridian" },
  ],
})
