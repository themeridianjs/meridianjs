import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

export interface CreateInvitationInput {
  workspace_id: string
  email?: string | null
  role: "admin" | "member"
  created_by: string
}

const createInvitationStep = createStep(
  "create-invitation",
  async (input: CreateInvitationInput, { container }) => {
    const svc = container.resolve("invitationModuleService") as any
    const invitation = await svc.createInvitationWithToken({
      workspace_id: input.workspace_id,
      email: input.email ?? null,
      role: input.role,
      created_by: input.created_by,
    })
    return new StepResponse(invitation, { invitationId: invitation.id })
  },
  async ({ invitationId }: { invitationId: string }, { container }) => {
    const svc = container.resolve("invitationModuleService") as any
    await svc.deleteInvitation(invitationId)
  }
)

export const createInvitationWorkflow = createWorkflow(
  "create-invitation",
  async (input: CreateInvitationInput) => {
    const invitation = await createInvitationStep(input)

    await emitEventStep({
      name: "workspace.member_invited",
      data: {
        invitation_id: invitation.id,
        workspace_id: invitation.workspace_id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        created_by: input.created_by,
      },
    })

    return new WorkflowResponse(invitation)
  }
)
