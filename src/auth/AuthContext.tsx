/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  api,
  json,
  onSesionExpirada,
  refrescarSesion,
  setAccessToken,
} from "@/lib/api"
import type { LoginResponse, Usuario } from "@/lib/types"

interface AuthState {
  usuario: Usuario | null
  /** true mientras se intenta recuperar la sesión al cargar la página */
  cargando: boolean
  login: (
    username: string,
    password: string,
    captchaToken?: string | null
  ) => Promise<void>
  logout: () => Promise<void>
  cambiarPassword: (actual: string, nueva: string) => Promise<void>
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = React.useState<Usuario | null>(null)
  const [cargando, setCargando] = React.useState(true)

  const aplicarSesion = React.useCallback((r: LoginResponse) => {
    setAccessToken(r.accessToken)
    setUsuario(r.usuario)
  }, [])

  // Al cargar la página, la cookie de refresh permite recuperar la sesión
  React.useEffect(() => {
    onSesionExpirada(() => setUsuario(null))
    refrescarSesion()
      .then(aplicarSesion)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false))
  }, [aplicarSesion])

  const login = React.useCallback(
    async (
      username: string,
      password: string,
      captchaToken?: string | null
    ) => {
      aplicarSesion(
        await api<LoginResponse>("/api/auth/login", {
          method: "POST",
          ...json({ username, password, captchaToken: captchaToken ?? null }),
        })
      )
    },
    [aplicarSesion]
  )

  const logout = React.useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" })
    } finally {
      setAccessToken(null)
      setUsuario(null)
    }
  }, [])

  const cambiarPassword = React.useCallback(
    async (passwordActual: string, passwordNueva: string) => {
      aplicarSesion(
        await api<LoginResponse>("/api/auth/cambiar-password", {
          method: "POST",
          ...json({ passwordActual, passwordNueva }),
        })
      )
    },
    [aplicarSesion]
  )

  const valor = React.useMemo(
    () => ({ usuario, cargando, login, logout, cambiarPassword }),
    [usuario, cargando, login, logout, cambiarPassword]
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
