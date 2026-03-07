import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import { useAuth } from "@/stores/auth"

export interface ProfileUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  designation: string | null
  phone_number: string | null
  has_password: boolean
  google_id: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<ProfileUser>("/admin/users/me"),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { updateLocalUser } = useAuth()
  return useMutation({
    mutationFn: (data: {
      first_name?: string
      last_name?: string
      designation?: string | null
      phone_number?: string | null
    }) => api.patch<{ user: ProfileUser }>("/admin/users/me", data),
    onSuccess: ({ user }) => {
      updateLocalUser({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        designation: user.designation,
        phone_number: user.phone_number,
      })
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  const { updateLocalUser } = useAuth()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("avatar", file)
      return api.upload<{ user: ProfileUser }>("/admin/users/me/avatar", form)
    },
    onSuccess: ({ user }) => {
      updateLocalUser({ avatar_url: user.avatar_url })
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

export function useRemoveAvatar() {
  const qc = useQueryClient()
  const { updateLocalUser } = useAuth()
  return useMutation({
    mutationFn: () => api.delete<{ ok: boolean }>("/admin/users/me/avatar"),
    onSuccess: () => {
      updateLocalUser({ avatar_url: null })
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

export function useSendPasswordOtp() {
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/admin/users/me/password/send-otp", {}),
  })
}

export function useSetPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { otp: string; new_password: string }) =>
      api.post<{ ok: boolean }>("/admin/users/me/password", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

export function useUnlinkGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ ok: boolean }>("/admin/users/me/google"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
    },
  })
}
