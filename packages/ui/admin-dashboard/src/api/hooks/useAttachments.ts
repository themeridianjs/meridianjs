import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface Attachment {
  id: string
  issue_id: string
  comment_id: string | null
  filename: string
  original_name: string
  mime_type: string
  size: number
  url: string
  uploader_id: string
  workspace_id: string
  created_at: string
}

export const attachmentKeys = {
  byIssue: (issueId: string) => ["attachments", issueId] as const,
}

export function useAttachments(issueId: string) {
  return useQuery({
    queryKey: attachmentKeys.byIssue(issueId),
    queryFn: () =>
      api.get<{ attachments: Attachment[] }>(`/admin/issues/${issueId}/attachments`),
    select: (data) => data.attachments,
    enabled: !!issueId,
  })
}

export function useUploadAttachment(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, commentId }: { file: File; commentId?: string }) => {
      const form = new FormData()
      form.append("file", file)
      if (commentId) form.append("comment_id", commentId)
      return api.upload<{ attachment: Attachment }>(
        `/admin/issues/${issueId}/attachments`,
        form
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attachmentKeys.byIssue(issueId) })
    },
  })
}

export function useDeleteAttachment(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete<{ attachment: Attachment }>(
        `/admin/issues/${issueId}/attachments/${attachmentId}`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attachmentKeys.byIssue(issueId) })
    },
  })
}
