export type Rol = "ADMIN" | "ADMISION" | "TRIAJE" | "MEDICO"

export const ROLES: Rol[] = ["ADMIN", "ADMISION", "TRIAJE", "MEDICO"]

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  ADMISION: "Admisión",
  TRIAJE: "Triaje",
  MEDICO: "Médico",
}

export interface Usuario {
  id: number
  username: string
  nombres: string
  apellidos: string
  dni: string
  email: string | null
  rol: Rol
  cmp: string | null
  activo: boolean
  debeCambiarPassword: boolean
  bloqueado: boolean
  ultimoAcceso: string | null
  creadoEn: string
}

export interface LoginResponse {
  accessToken: string
  tipo: string
  expiraEnSegundos: number
  usuario: Usuario
}

export interface PasswordTemporalResponse {
  usuario: Usuario
  passwordTemporal: string
}

export interface Pagina<T> {
  contenido: T[]
  pagina: number
  tamanio: number
  totalElementos: number
  totalPaginas: number
}

export interface RegistroAuditoria {
  id: number
  fecha: string
  usuarioId: number | null
  username: string | null
  rol: string | null
  accion: string
  recurso: string
  recursoId: string | null
  pacienteId: number | null
  detalle: string | null
  ip: string | null
}
