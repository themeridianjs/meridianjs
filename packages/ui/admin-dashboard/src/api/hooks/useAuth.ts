import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { useAuth } from "@/stores/auth"

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  email: string
  password: string
  first_name: string
  last_name: string
  otp?: string
}

interface AuthResponse {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  token: string
}

/** Checks if the app needs first-time setup and which optional features are available. */
export function useSetupStatus() {
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: () => api.get<{ needsSetup: boolean; googleOAuthEnabled: boolean; registrationEnabled: boolean }>("/auth/setup"),
    staleTime: 60_000,
    retry: false,
  })
}

export function useSendRegistrationOtp() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.post<{ ok: boolean }>("/auth/register/send-otp", data),
  })
}

export function useLogin() {
  const { login } = useAuth()
  return useMutation({
    mutationFn: (data: LoginInput) => api.post<AuthResponse>("/auth/login", data),
    onSuccess: (data) => {
      login(data.user, data.token)
    },
  })
}

export function useRegister() {
  const { login } = useAuth()
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse>("/auth/register", data),
    onSuccess: (data) => {
      login(data.user, data.token)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.post<{ ok: boolean; message: string }>("/auth/forgot-password", data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.post<{ ok: boolean; message: string }>("/auth/reset-password", data),
  })
}

export function useRegisterViaInvite(token: string) {
  const { login } = useAuth()
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse>(`/auth/invite/${token}`, data),
    onSuccess: (data) => {
      login(data.user, data.token)
    },
  })
}
