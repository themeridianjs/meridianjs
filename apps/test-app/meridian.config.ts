import { defineConfig } from "@meridian/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://arjusmoon@localhost:5432/meridian_test",
    jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-for-testing-only",
    httpPort: 9000,
  },
  modules: [
    // Infrastructure
    { resolve: "@meridian/event-bus-local" },
    // Domain modules — order matters: project before issue (issue resolves projectModuleService)
    { resolve: "@meridian/user" },
    { resolve: "@meridian/workspace" },
    { resolve: "@meridian/auth" },
    { resolve: "@meridian/project" },
    { resolve: "@meridian/issue" },
    { resolve: "@meridian/sprint" },
    { resolve: "@meridian/activity" },
    // Local test module (Phase 1 smoke test)
    { resolve: "./src/modules/hello-module/index.ts" },
  ],
})
