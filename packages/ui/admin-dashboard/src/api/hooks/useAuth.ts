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

/** Checks if the app needs first-time setup (no users registered yet). */
export function useSetupStatus() {
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: () => api.get<{ needsSetup: boolean }>("/auth/setup"),
    staleTime: 60_000,
    retry: false,
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
