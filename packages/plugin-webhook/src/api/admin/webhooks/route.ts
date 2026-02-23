import type { Response } from "express"

/**
 * GET /admin/webhooks
 *
 * List all received webhook events. Protected by the app's auth middleware.
 *
 * Query params:
 *   ?provider=github   — filter by provider
 *   ?status=received   — filter by status (received | processed | failed)
 *   ?limit=20
 *   ?offset=0
 */
export const GET = async (req: any, res: Response) => {
  const webhookService = req.scope.resolve("webhookModuleService") as any

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}

  if (req.query.provider) filters.provider = req.query.provider
  if (req.query.status) filters.status = req.query.status

  const [webhooks, count] = await webhookService.listAndCountWebhookEvents(filters, {
    limit,
    offset,
    orderBy: { created_at: "DESC" },
  })

  res.json({ webhooks, count, limit, offset })
}

/**
 * DELETE /admin/webhooks/:id
 */
export const DELETE = async (req: any, res: Response) => {
  const webhookService = req.scope.resolve("webhookModuleService") as any
  await webhookService.deleteWebhookEvent(req.params.id)
  res.status(204).send()
}
