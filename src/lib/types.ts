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
  prioridad: Prioridad | null
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

// --- Triaje y alergias (fase 4) ---

export type Prioridad = "NORMAL" | "PREFERENTE" | "URGENTE"

export const NOMBRE_PRIORIDAD: Record<Prioridad, string> = {
  NORMAL: "Normal",
  PREFERENTE: "Preferente",
  URGENTE: "Urgente",
}

/** Orden para comparar prioridades (mayor = más prioritario). */
export const NIVEL_PRIORIDAD: Record<Prioridad, number> = {
  NORMAL: 0,
  PREFERENTE: 1,
  URGENTE: 2,
}

export type Severidad = "ADVERTENCIA" | "CRITICA"

export interface Alerta {
  codigo: string
  severidad: Severidad
  mensaje: string
}

export interface Evaluacion {
  alertas: Alerta[]
  imc: number | null
  prioridadSugerida: Prioridad
}

export interface Triaje {
  id: number
  citaId: number
  pacienteId: number
  fechaHora: string
  registradoPor: string
  motivoConsulta: string
  presionSistolica: number | null
  presionDiastolica: number | null
  frecuenciaCardiaca: number
  frecuenciaRespiratoria: number | null
  temperatura: number
  saturacion: number
  peso: number
  talla: number | null
  imc: number | null
  perimetroAbdominal: number | null
  gestante: boolean
  discapacidad: boolean
  prioridadSugerida: Prioridad
  prioridad: Prioridad
  justificacionPrioridad: string | null
  observaciones: string | null
  alertas: Alerta[]
}

export type TipoAlergia = "MEDICAMENTO" | "ALIMENTO" | "AMBIENTAL" | "OTRO"
export type GravedadAlergia = "LEVE" | "MODERADA" | "SEVERA"

export const NOMBRE_TIPO_ALERGIA: Record<TipoAlergia, string> = {
  MEDICAMENTO: "Medicamento",
  ALIMENTO: "Alimento",
  AMBIENTAL: "Ambiental",
  OTRO: "Otro",
}

export const NOMBRE_GRAVEDAD: Record<GravedadAlergia, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  SEVERA: "Severa",
}

export interface Alergia {
  id: number
  tipo: TipoAlergia
  sustancia: string
  reaccion: string | null
  gravedad: GravedadAlergia
  activa: boolean
  motivoInactivacion: string | null
  registradoPor: string
  creadoEn: string
}

// --- Atención médica (fase 5) ---

export type TipoDiagnostico = "PRESUNTIVO" | "DEFINITIVO"

export type ViaAdministracion =
  | "ORAL"
  | "SUBLINGUAL"
  | "TOPICA"
  | "OFTALMICA"
  | "OTICA"
  | "NASAL"
  | "INHALATORIA"
  | "VAGINAL"
  | "RECTAL"
  | "INTRAMUSCULAR"
  | "ENDOVENOSA"
  | "SUBCUTANEA"

export const NOMBRE_VIA: Record<ViaAdministracion, string> = {
  ORAL: "Oral",
  SUBLINGUAL: "Sublingual",
  TOPICA: "Tópica",
  OFTALMICA: "Oftálmica",
  OTICA: "Ótica",
  NASAL: "Nasal",
  INHALATORIA: "Inhalatoria",
  VAGINAL: "Vaginal",
  RECTAL: "Rectal",
  INTRAMUSCULAR: "Intramuscular",
  ENDOVENOSA: "Endovenosa",
  SUBCUTANEA: "Subcutánea",
}

export interface Cie10 {
  codigo: string
  descripcion: string
}

export interface MedicamentoCatalogo {
  id: number
  nombre: string
  concentracion: string
  formaFarmaceutica: string
  descripcion: string
}

export interface Atencion {
  id: number
  citaId: number
  paciente: {
    id: number
    numeroHc: string
    nombreCompleto: string
    edad: string
    sexo: Sexo
  }
  medico: { id: number; nombreCompleto: string; cmp: string | null }
  estado: "EN_CURSO" | "CERRADA"
  inicioEn: string
  cerradaEn: string | null
  motivoConsulta: string
  tiempoEnfermedad: string | null
  anamnesis: string | null
  examenFisico: string | null
  planTrabajo: string | null
  indicaciones: string | null
  diagnosticos: {
    codigo: string
    descripcion: string
    tipo: TipoDiagnostico
    principal: boolean
  }[]
  receta: {
    medicamentoId: number
    medicamento: string
    dosis: string
    via: ViaAdministracion
    frecuencia: string
    duracion: string
    cantidad: number
    indicaciones: string | null
    alergiaConfirmada: boolean
    justificacionAlergia: string | null
  }[]
  plan: ItemPlan[]
  descanso: { dias: number; desde: string; hasta: string } | null
  control: { fecha: string; nota: string | null } | null
  adendas: { id: number; autor: string; texto: string; creadoEn: string }[]
}

// --- Tratamiento estructurado (fase 9) ---

export type TipoPlan = "TRATAMIENTO" | "EXAMEN" | "INTERCONSULTA"

export type CategoriaPlan =
  | "DIETA"
  | "REPOSO"
  | "FISIOTERAPIA"
  | "CURACION"
  | "LABORATORIO"
  | "IMAGEN"
  | "OTRO"

/** Categorías que admite cada tipo de indicación (la interconsulta no lleva). */
export const CATEGORIAS_PLAN: Record<TipoPlan, CategoriaPlan[]> = {
  TRATAMIENTO: ["DIETA", "REPOSO", "FISIOTERAPIA", "CURACION", "OTRO"],
  EXAMEN: ["LABORATORIO", "IMAGEN", "OTRO"],
  INTERCONSULTA: [],
}

export const NOMBRE_CATEGORIA_PLAN: Record<CategoriaPlan, string> = {
  DIETA: "Dieta",
  REPOSO: "Reposo",
  FISIOTERAPIA: "Fisioterapia",
  CURACION: "Curación",
  LABORATORIO: "Laboratorio",
  IMAGEN: "Imagen",
  OTRO: "Otro",
}

/** Indicación del plan que no es un medicamento. En la interconsulta, descripción = especialidad y detalle = motivo. */
export interface ItemPlan {
  tipo: TipoPlan
  categoria: CategoriaPlan | null
  descripcion: string
  detalle: string | null
}

/** Control sugerido por un médico que aún no tiene cita. Lo ve ADMISION: no incluye contenido clínico. */
export interface ControlPendiente {
  atencionId: number
  pacienteId: number
  numeroHc: string
  paciente: string
  medicoId: number
  medico: string
  consultorioId: number
  consultorio: string
  fechaSugerida: string
  vencido: boolean
}

// --- Documentos clínicos (fase 6) ---

export type TipoDocumentoClinico =
  | "LABORATORIO"
  | "RECETA"
  | "INFORME_MEDICO"
  | "EPICRISIS"
  | "IMAGENOLOGIA"
  | "REFERENCIA"
  | "OTRO"

export const NOMBRE_TIPO_DOCUMENTO_CLINICO: Record<
  TipoDocumentoClinico,
  string
> = {
  LABORATORIO: "Laboratorio",
  RECETA: "Receta",
  INFORME_MEDICO: "Informe médico",
  EPICRISIS: "Epicrisis",
  IMAGENOLOGIA: "Imagenología",
  REFERENCIA: "Referencia",
  OTRO: "Otro",
}

export interface DocumentoClinico {
  id: number
  pacienteId: number
  citaId: number | null
  tipo: TipoDocumentoClinico
  descripcion: string | null
  fechaDocumento: string | null
  nombreOriginal: string
  contentType: string
  tamanioBytes: number
  estado: "RECIBIDO" | "ANULADO"
  motivoAnulacion: string | null
  subidoPorId: number
  subidoPor: string
  creadoEn: string
}

// --- Revisión de documentos, antecedentes y laboratorio (fase 8) ---

export type CategoriaItem =
  | "ALERGIA"
  | "DIAGNOSTICO"
  | "MEDICAMENTO"
  | "LABORATORIO"
  | "ANTECEDENTE"
  | "OTRO"

export const NOMBRE_CATEGORIA: Record<CategoriaItem, string> = {
  ALERGIA: "Alergias",
  DIAGNOSTICO: "Diagnósticos previos",
  MEDICAMENTO: "Medicamentos en uso",
  LABORATORIO: "Resultados de laboratorio",
  ANTECEDENTE: "Antecedentes",
  OTRO: "Otra información",
}

export type EstadoItem = "PROPUESTO" | "ACEPTADO" | "CORREGIDO" | "DESCARTADO"

export type TipoAntecedente =
  | "PERSONAL"
  | "FAMILIAR"
  | "QUIRURGICO"
  | "DIAGNOSTICO_PREVIO"
  | "MEDICACION_HABITUAL"
  | "OTRO"

export const NOMBRE_TIPO_ANTECEDENTE: Record<TipoAntecedente, string> = {
  PERSONAL: "Personal",
  FAMILIAR: "Familiar",
  QUIRURGICO: "Quirúrgico",
  DIAGNOSTICO_PREVIO: "Diagnóstico previo",
  MEDICACION_HABITUAL: "Medicación habitual",
  OTRO: "Otro",
}

/** Un dato del documento. Según la categoría se usan unos campos u otros. */
export interface ItemExtraccion {
  id: number
  categoria: CategoriaItem
  estado: EstadoItem
  descripcion: string
  detalle: string | null
  fecha: string | null
  tipoAlergia: TipoAlergia | null
  gravedad: GravedadAlergia | null
  cieCodigo: string | null
  medicamentoId: number | null
  valor: string | null
  unidad: string | null
  rangoReferencia: string | null
  tipoAntecedente: TipoAntecedente | null
  fragmentoOrigen: string | null
  pagina: number | null
  corregido: boolean
  creadoPorId: number
  creadoPor: string
}

export type EstadoExtraccion = "PENDIENTE_REVISION" | "VALIDADA" | "RECHAZADA"

/** Revisión de los datos de un documento: la valida un médico. */
export interface Extraccion {
  id: number
  documentoId: number
  pacienteId: number
  origen: "MANUAL" | "IA"
  estado: EstadoExtraccion
  motivoRechazo: string | null
  creadoPor: string
  creadoEn: string
  revisadoPor: string | null
  revisadoEn: string | null
  items: ItemExtraccion[]
}

export interface ExtraccionResumen {
  id: number
  documentoId: number
  origen: "MANUAL" | "IA"
  estado: EstadoExtraccion
  totalItems: number
  creadoEn: string
}

export interface Antecedente {
  id: number
  tipo: TipoAntecedente
  descripcion: string
  detalle: string | null
  fecha: string | null
  cieCodigo: string | null
  medicamentoId: number | null
  documentoId: number | null
  activo: boolean
  motivoInactivacion: string | null
  registradoPor: string
  creadoEn: string
}

export interface ResultadoLaboratorio {
  id: number
  examen: string
  valor: string
  unidad: string | null
  rangoReferencia: string | null
  fecha: string | null
  documentoId: number | null
  activo: boolean
  motivoInactivacion: string | null
  registradoPor: string
  creadoEn: string
}

// --- Reportes (fase 7) ---

export interface Conteo {
  codigo: string
  etiqueta: string
  total: number
}

export interface Reporte {
  desde: string
  hasta: string
  totales: {
    citas: number
    atendidas: number
    noSePresento: number
    canceladas: number
    tasaInasistencia: number | null
    pacientesNuevos: number
  }
  tiemposEspera: {
    llegadaATriaje: number | null
    triajeAConsulta: number | null
    duracionConsulta: number | null
  }
  citasPorEstado: Conteo[]
  atencionesPorDia: { fecha: string; total: number }[]
  atencionesPorMedico: Conteo[]
  atencionesPorConsultorio: Conteo[]
  diagnosticosFrecuentes: Conteo[]
  prioridades: Conteo[]
  pacientesPorFinanciamiento: Conteo[]
}
