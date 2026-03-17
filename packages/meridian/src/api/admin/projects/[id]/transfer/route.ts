import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { transferProjectWorkflow } from "../../../../../workflows/transfer-project.js"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:update")(req, res, async () => {
    try {
      const { target_workspace_id, carry_over_user_ids } = req.body
      if (!target_workspace_id) {
        res.status(400).json({ error: { message: "target_workspace_id is required" } })
        return
      }
      if (!Array.isArray(carry_over_user_ids)) {
        res.status(400).json({ error: { message: "carry_over_user_ids must be an array" } })
        return
      }

      const { result: project, errors, transaction_status } = await transferProjectWorkflow(req.scope).run({
        input: {
          project_id: req.params.id,
          target_workspace_id,
          carry_over_user_ids,
          actor_id: req.user?.id ?? null,
        },
      })

      if (transaction_status === "reverted") {
        const err = errors[0]
        res.status((err as any).status ?? 500).json({ error: { message: err.message } })
        return
      }

      res.json({ project })
    } catch (err) {
      next(err)
    }
  })
}
