import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const config = req.scope.resolve("config") as any

  let googleOAuthEnabled = false
  try {
    req.scope.resolve("googleOAuthService")
    googleOAuthEnabled = true
  } catch {
    // googleOAuthService not registered — feature disabled
  }

  res.json({
    maxChildIssueDepth: config?.projectConfig?.maxChildIssueDepth ?? 1,
    googleOAuthEnabled,
  })
}
