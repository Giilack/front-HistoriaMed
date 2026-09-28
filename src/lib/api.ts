import type { LoginResponse } from "./types"

/** Error de la API con el formato ErrorResponse del backend. */
export class ApiError extends Error {
  readonly status: number
  readonly codigo: string
  readonly errores: Record<string, string>

  constructor(
    status: number,
    codigo: string,
    mensaje: string,
    errores: Record<string, string> = {}
  ) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
    this.errores = errores
  }
}

// El access token vive solo en memoria (no en localStorage): si alguien inyecta
// JavaScript no puede robarlo del almacenamiento. Al recargar la página se
// recupera con /api/auth/refresh usando la cookie httpOnly.
let accessToken: string | null = null
let alExpirarSesion: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function onSesionExpirada(callback: () => void) {
  alExpirarSesion = callback
}

// Si varias peticiones reciben 401 a la vez, se renueva el token una sola vez.
let refrescoEnCurso: Promise<LoginResponse> | null = null

export function refrescarSesion(): Promise<LoginResponse> {
  if (!refrescoEnCurso) {
    refrescoEnCurso = peticion<LoginResponse>("/api/auth/refresh", {
      method: "POST",
    })
      .then((r) => {
        accessToken = r.accessToken
        return r
      })
      .finally(() => {
        refrescoEnCurso = null
      })
  }
  return refrescoEnCurso
}

async function peticion<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)

  const res = await fetch(ruta, {
    ...init,
    headers,
    credentials: "same-origin",
  })
  if (res.status === 204) return undefined as T

  const datos = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      datos?.error ?? "ERROR",
      datos?.mensaje ?? `Error ${res.status}`,
      datos?.errores ?? {}
    )
  }
  return datos as T
}

/**
 * Llama a la API. Si el access token expiró (401), lo renueva una vez y reintenta.
 */
export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  try {
    return await peticion<T>(ruta, init)
  } catch (e) {
    const esRutaAuth = ruta.startsWith("/api/auth/")
    if (!(e instanceof ApiError) || e.status !== 401 || esRutaAuth) throw e
    try {
      await refrescarSesion()
    } catch {
      accessToken = null
      alExpirarSesion?.()
      throw e
    }
    return peticion<T>(ruta, init)
  }
}

export function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) }
}
