import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const { user_id, role } = req.body

  if (!user_id) {
    res.status(400).json({ error: { message: "user_id is required" } })
    return
  }

  await projectMemberService.ensureProjectMember(req.params.id, user_id, role ?? "member")
  res.status(201).json({ ok: true })
}
