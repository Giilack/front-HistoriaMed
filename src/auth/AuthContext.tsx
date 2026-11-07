/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  api,
  ApiError,
  haySesionPrevia,
  json,
  marcarSesion,
  onSesionExpirada,
  refrescarSesion,
  setAccessToken,
} from "@/lib/api"
import type { LoginResponse, Usuario } from "@/lib/types"

/** Tiempo máximo con la pantalla de carga mientras se recupera la sesión (luego se muestra el login). */
const ESPERA_MAXIMA_MS = 8000

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
  // Sin sesión previa en este navegador no hay nada que recuperar: el login se muestra de inmediato
  const [cargando, setCargando] = React.useState(haySesionPrevia)

  const aplicarSesion = React.useCallback((r: LoginResponse) => {
    setAccessToken(r.accessToken)
    setUsuario(r.usuario)
    marcarSesion(true)
  }, [])

  // Al cargar la página, la cookie de refresh permite recuperar la sesión. Solo se intenta si en este
  // navegador hubo una sesión; y si el backend está arrancando en frío, a los ESPERA_MAXIMA_MS se muestra
  // el login en lugar de dejar la pantalla de carga: si la sesión se recupera después, se entra sola.
  React.useEffect(() => {
    onSesionExpirada(() => {
      marcarSesion(false)
      setUsuario(null)
    })
    if (!haySesionPrevia()) return
    const reloj = setTimeout(() => setCargando(false), ESPERA_MAXIMA_MS)
    refrescarSesion()
      .then(aplicarSesion)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) marcarSesion(false)
        setUsuario(null)
      })
      .finally(() => {
        clearTimeout(reloj)
        setCargando(false)
      })
    return () => clearTimeout(reloj)
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
      marcarSesion(false)
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
