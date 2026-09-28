import { z } from "zod"

import type { Paciente } from "@/lib/types"

// Mismas reglas que el backend (PacienteRequest / PacienteService): se validan aquí para dar
// respuesta inmediata, pero el backend sigue siendo quien decide.

const TELEFONO = /^[0-9+ ]{6,15}$/
const DOCUMENTO = /^[A-Za-z0-9]{1,20}$/

function hoyISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const opcional = (max: number) =>
  z.string().trim().max(max, `máximo ${max} caracteres`)

const telefonoOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || TELEFONO.test(v), "teléfono inválido")

export const financiamientoSchema = z
  .object({
    tipo: z.enum(["SIS", "ESSALUD", "PRIVADO", "PARTICULAR"]),
    numeroAfiliacion: opcional(30),
    plan: opcional(60),
    orientadoAfiliacionSis: z.boolean(),
  })
  .superRefine((f, ctx) => {
    if (f.tipo === "PRIVADO" && f.plan === "") {
      ctx.addIssue({
        code: "custom",
        path: ["plan"],
        message: "indique la aseguradora o EPS",
      })
    }
  })

export const pacienteSchema = z
  .object({
    tipoDocumento: z.enum([
      "DNI",
      "CARNET_EXTRANJERIA",
      "PASAPORTE",
      "SIN_DOCUMENTO",
    ]),
    numeroDocumento: z.string().trim(),
    nombres: z.string().trim().min(1, "obligatorio").max(100),
    apellidoPaterno: z.string().trim().min(1, "obligatorio").max(100),
    apellidoMaterno: opcional(100),
    fechaNacimiento: z
      .string()
      .min(1, "obligatorio")
      .refine((v) => v <= hoyISO(), "no puede ser una fecha futura"),
    sexo: z.enum(["MASCULINO", "FEMENINO"], { message: "seleccione el sexo" }),
    telefono: telefonoOpcional,
    email: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || z.email().safeParse(v).success,
        "email inválido"
      ),
    direccion: opcional(200),
    contactoEmergenciaNombre: opcional(150),
    contactoEmergenciaTelefono: telefonoOpcional,
    contactoEmergenciaParentesco: opcional(30),
    financiamiento: financiamientoSchema,
  })
  .superRefine((p, ctx) => {
    if (p.tipoDocumento === "SIN_DOCUMENTO") return
    const n = p.numeroDocumento
    if (n === "") {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: "obligatorio",
      })
    } else if (p.tipoDocumento === "DNI" && !/^\d{8}$/.test(n)) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: "el DNI debe tener 8 dígitos",
      })
    } else if (!DOCUMENTO.test(n)) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: "solo letras y números",
      })
    }
  })

export type PacienteForm = z.infer<typeof pacienteSchema>
export type FinanciamientoForm = z.infer<typeof financiamientoSchema>

export const FINANCIAMIENTO_VACIO: FinanciamientoForm = {
  tipo: "PARTICULAR",
  numeroAfiliacion: "",
  plan: "",
  orientadoAfiliacionSis: false,
}

export const PACIENTE_VACIO: PacienteForm = {
  tipoDocumento: "DNI",
  numeroDocumento: "",
  nombres: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  fechaNacimiento: "",
  sexo: "" as PacienteForm["sexo"],
  telefono: "",
  email: "",
  direccion: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
  contactoEmergenciaParentesco: "",
  financiamiento: FINANCIAMIENTO_VACIO,
}

export function formDesdePaciente(p: Paciente): PacienteForm {
  return {
    tipoDocumento: p.tipoDocumento,
    numeroDocumento: p.numeroDocumento ?? "",
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno ?? "",
    fechaNacimiento: p.fechaNacimiento,
    sexo: p.sexo,
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    direccion: p.direccion ?? "",
    contactoEmergenciaNombre: p.contactoEmergenciaNombre ?? "",
    contactoEmergenciaTelefono: p.contactoEmergenciaTelefono ?? "",
    contactoEmergenciaParentesco: p.contactoEmergenciaParentesco ?? "",
    financiamiento: financiamientoDesdePaciente(p),
  }
}

export function financiamientoDesdePaciente(p: Paciente): FinanciamientoForm {
  return {
    tipo: p.financiamiento.tipo,
    numeroAfiliacion: p.financiamiento.numeroAfiliacion ?? "",
    plan: p.financiamiento.plan ?? "",
    orientadoAfiliacionSis: p.financiamiento.orientadoAfiliacionSis,
  }
}

/** Convierte "" en null para enviar al backend. */
const nulo = (v: string) => (v.trim() === "" ? null : v.trim())

export function financiamientoAPayload(f: FinanciamientoForm) {
  const tieneSeguro = f.tipo !== "PARTICULAR"
  return {
    tipo: f.tipo,
    numeroAfiliacion: tieneSeguro ? nulo(f.numeroAfiliacion) : null,
    plan: tieneSeguro ? nulo(f.plan) : null,
    orientadoAfiliacionSis: !tieneSeguro && f.orientadoAfiliacionSis,
  }
}

export function pacienteAPayload(p: PacienteForm) {
  return {
    tipoDocumento: p.tipoDocumento,
    numeroDocumento:
      p.tipoDocumento === "SIN_DOCUMENTO"
        ? null
        : p.numeroDocumento.trim().toUpperCase(),
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: nulo(p.apellidoMaterno),
    fechaNacimiento: p.fechaNacimiento,
    sexo: p.sexo,
    telefono: nulo(p.telefono),
    email: nulo(p.email),
    direccion: nulo(p.direccion),
    contactoEmergenciaNombre: nulo(p.contactoEmergenciaNombre),
    contactoEmergenciaTelefono: nulo(p.contactoEmergenciaTelefono),
    contactoEmergenciaParentesco: nulo(p.contactoEmergenciaParentesco),
    financiamiento: financiamientoAPayload(p.financiamiento),
  }
}
