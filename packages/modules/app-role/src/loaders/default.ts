import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import AppRoleModel from "../models/app-role.js"

const SEED_ROLES = [
  {
    name: "User",
    description: "Standard permissions for regular team members",
    is_system: true,
    permissions: ["issue:create", "issue:update", "issue:assign", "issue:update_status", "sprint:create", "workspace:create"],
  },
  {
    name: "Viewer",
    description: "Read-only access — cannot create or modify anything",
    is_system: true,
    permissions: [],
  },
  {
    name: "Workspace Admin",
    description: "Full workspace management — members, projects, teams, and roles",
    is_system: true,
    permissions: [
      "workspace:admin", "workspace:create", "workspace:update",
      "member:invite", "member:remove", "member:update_role",
      "project:create", "project:update", "project:delete", "project:archive", "project:manage_access",
      "issue:create", "issue:update", "issue:delete", "issue:assign", "issue:update_status",
      "sprint:create", "sprint:start", "sprint:complete", "sprint:delete",
      "team:create", "team:update", "team:delete", "team:manage_members",
      "role:create", "role:update", "role:delete", "role:assign",
    ],
  },
]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(AppRoleModel)],
    config.projectConfig.databaseUrl
  )
  const repo = createRepository(orm, "app_role")

  container.register({
    appRoleRepository: repo,
    appRoleOrm: orm,
  })

  // Seed system roles on cold boot (non-critical)
  try {
    // Migrate legacy "Default Member" → "User"
    const legacyMember = await repo.findOne({ name: "Default Member" })
    if (legacyMember) {
      legacyMember.name = "User"
      legacyMember.permissions = ["issue:create", "issue:update", "issue:assign", "issue:update_status", "sprint:create", "workspace:create"]
      await repo.persistAndFlush(legacyMember)
    }

    for (const seed of SEED_ROLES) {
      const existing = await repo.findOne({ name: seed.name })
      if (!existing) {
        const role = repo.create(seed)
        await repo.persistAndFlush(role)
      }
    }
  } catch {
    // Don't block startup if seeding fails
  }
}
