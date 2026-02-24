import type { Response } from "express"

export const DELETE = async (req: any, res: Response) => {
  const svc = req.scope.resolve("invitationModuleService") as any
  await svc.revokeInvitation(req.params.inviteId)
  res.status(204).send()
}
