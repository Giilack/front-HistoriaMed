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

// --- Pacientes (fase 2) ---

export type TipoDocumento =
  "DNI" | "CARNET_EXTRANJERIA" | "PASAPORTE" | "SIN_DOCUMENTO"
export type Sexo = "MASCULINO" | "FEMENINO"
export type TipoFinanciamiento = "SIS" | "ESSALUD" | "PRIVADO" | "PARTICULAR"
export type EstadoSeguro = "NO_VERIFICADO" | "ACTIVO" | "INACTIVO"

export const NOMBRE_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: "DNI",
  CARNET_EXTRANJERIA: "Carné de extranjería",
  PASAPORTE: "Pasaporte",
  SIN_DOCUMENTO: "Sin documento",
}

export const NOMBRE_FINANCIAMIENTO: Record<TipoFinanciamiento, string> = {
  SIS: "SIS",
  ESSALUD: "EsSalud",
  PRIVADO: "Seguro privado / EPS",
  PARTICULAR: "Particular (sin seguro)",
}

export const NOMBRE_ESTADO_SEGURO: Record<EstadoSeguro, string> = {
  NO_VERIFICADO: "No verificado",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
}

export interface Financiamiento {
  tipo: TipoFinanciamiento
  numeroAfiliacion: string | null
  plan: string | null
  estado: EstadoSeguro | null
  verificadoEn: string | null
  orientadoAfiliacionSis: boolean
}

export interface Paciente {
  id: number
  numeroHc: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  nombreCompleto: string
  fechaNacimiento: string
  edad: string
  sexo: Sexo
  telefono: string | null
  email: string | null
  direccion: string | null
  contactoEmergenciaNombre: string | null
  contactoEmergenciaTelefono: string | null
  contactoEmergenciaParentesco: string | null
  financiamiento: Financiamiento
  creadoEn: string
  actualizadoEn: string
}

export interface PacienteResumen {
  id: number
  numeroHc: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string | null
  nombreCompleto: string
  edad: string
  sexo: Sexo
  tipoFinanciamiento: TipoFinanciamiento
  estadoSeguro: EstadoSeguro | null
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

// --- Consultorios, médicos y citas (fase 3) ---

export interface Consultorio {
  id: number
  nombre: string
  especialidad: string
  activo: boolean
}

export interface Medico {
  id: number
  nombreCompleto: string
  cmp: string | null
}

export type EstadoCita =
  | "PROGRAMADA"
  | "EN_ESPERA_TRIAJE"
  | "EN_ESPERA_CONSULTA"
  | "EN_CONSULTA"
  | "ATENDIDO"
  | "CANCELADA"
  | "NO_SE_PRESENTO"

export const NOMBRE_ESTADO_CITA: Record<EstadoCita, string> = {
  PROGRAMADA: "Programada",
  EN_ESPERA_TRIAJE: "En espera de triaje",
  EN_ESPERA_CONSULTA: "En espera de consulta",
  EN_CONSULTA: "En consulta",
  ATENDIDO: "Atendido",
  CANCELADA: "Cancelada",
  NO_SE_PRESENTO: "No se presentó",
}

export interface Cita {
  id: number
  fecha: string
  hora: string | null
  sinCita: boolean
  estado: EstadoCita
  numeroTurno: number | null
  motivo: string | null
  paciente: {
    id: number
    numeroHc: string
    nombreCompleto: string
    edad: string
    sexo: Sexo
    tipoFinanciamiento: TipoFinanciamiento
  }
  medico: Medico
  consultorio: Consultorio
  llegadaEn: string | null
  triajeEn: string | null
  consultaInicioEn: string | null
  atendidoEn: string | null
  canceladaEn: string | null
  motivoCancelacion: string | null
  creadoEn: string
}
