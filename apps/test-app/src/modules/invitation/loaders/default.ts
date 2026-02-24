import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import InvitationModel from "../models/invitation.js"

const InvitationSchema = dmlToEntitySchema(InvitationModel)

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm([InvitationSchema], databaseUrl)
  const em = orm.em.fork()

  container.register({
    invitationRepository: createRepository(em, "invitation"),
    invitationOrm: orm,
  })
}
