import { z } from "zod"
import type { Response } from "express"

/** Public endpoint — no auth middleware. Returns invitation + workspace name for the accept page. */
export const GET = async (req: any, res: Response) => {
  const invitationService = req.scope.resolve("invitationModuleService") as any
  const workspaceService = req.scope.resolve("workspaceModuleService") as any

  const [invitations] = await invitationService.listAndCountInvitations(
    { token: req.params.token },
    { limit: 1 }
  )
  const invitation = invitations[0]

  if (!invitation) {
    res.status(404).json({ error: { message: "Invitation not found" } })
    return
  }

  if (invitation.status !== "pending") {
    res.status(410).json({ error: { message: `Invitation has been ${invitation.status}` } })
    return
  }

  const workspace = await workspaceService.retrieveWorkspace(invitation.workspace_id)

  res.json({
    invitation: {
      id: invitation.id,
      role: invitation.role,
      email: invitation.email,
      status: invitation.status,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
  })
}

const acceptSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
})

/**
 * POST /auth/invite/:token
 * Public — registers a new user via an invite link.
 * If the invitation has a specific email, the submitted email must match.
 */
export const POST = async (req: any, res: Response) => {
  const invitationService = req.scope.resolve("invitationModuleService") as any
  const authService = req.scope.resolve("authModuleService") as any

  // Look up invitation
  const [invitations] = await invitationService.listAndCountInvitations(
    { token: req.params.token },
    { limit: 1 }
  )
  const invitation = invitations[0]

  if (!invitation) {
    res.status(404).json({ error: { message: "Invitation not found" } })
    return
  }

  if (invitation.status !== "pending") {
    res.status(410).json({ error: { message: `Invitation has already been ${invitation.status}` } })
    return
  }

  // Validate body
  const parsed = acceptSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten().fieldErrors } })
    return
  }

  // If this invite was sent to a specific email, enforce it
  if (invitation.email && invitation.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    res.status(422).json({
      error: { message: `This invitation was sent to ${invitation.email}. Please use that email address.` },
    })
    return
  }

  // Register the user with the invited role
  const authResult = await authService.register({
    email: parsed.data.email,
    password: parsed.data.password,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: invitation.role,
  })

  // Mark invitation as accepted
  await invitationService.updateInvitation(invitation.id, { status: "accepted" })

  res.status(201).json(authResult)
}
