import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const config = req.scope.resolve("config") as any
  res.json({
    maxChildIssueDepth: config?.projectConfig?.maxChildIssueDepth ?? 1,
  })
}
