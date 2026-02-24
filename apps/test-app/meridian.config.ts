import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://arjusmoon@localhost:5432/meridian_test",
    jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-for-testing-only",
    httpPort: 9000,
  },
  modules: [
    // Infrastructure
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
    // Domain modules — order matters: project before issue (issue resolves projectModuleService)
    { resolve: "@meridianjs/user" },
    { resolve: "@meridianjs/workspace" },
    { resolve: "@meridianjs/auth" },
    { resolve: "@meridianjs/project" },
    { resolve: "@meridianjs/issue" },
    { resolve: "@meridianjs/sprint" },
    { resolve: "@meridianjs/activity" },
    { resolve: "@meridianjs/notification" },
    // Local test module (Phase 1 smoke test)
    { resolve: "./src/modules/hello-module/index.ts" },
  ],
  plugins: [
    // Phase 9 reference plugin: webhook receiver
    { resolve: "@meridianjs/plugin-webhook" },
  ],
})
