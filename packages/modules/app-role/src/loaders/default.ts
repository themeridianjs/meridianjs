import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import AppRoleModel from "../models/app-role.js"

const SEED_ROLES = [
  {
    name: "Default Member",
    description: "Standard permissions for regular team members",
    is_system: true,
    permissions: ["issue:create", "issue:update", "issue:assign", "issue:update_status", "sprint:create"],
  },
  {
    name: "Viewer",
    description: "Read-only access — cannot create or modify anything",
    is_system: true,
    permissions: [],
  },
]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(AppRoleModel)],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()
  const repo = createRepository(em, "app_role")

  container.register({
    appRoleRepository: repo,
    appRoleOrm: orm,
  })

  // Seed system roles on cold boot (non-critical)
  try {
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
