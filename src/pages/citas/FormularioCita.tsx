import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api, json } from "@/lib/api"
import { formatearHora, hoyISO } from "@/lib/fechas"
import type { Cita, Consultorio, Medico, PacienteResumen } from "@/lib/types"

import { BuscadorPaciente } from "./BuscadorPaciente"

/** nueva: cita programada · sinCita: llegó sin cita (va directo a la cola) · reprogramar: cambia fecha/hora/médico */
export type ModoCita =
  { tipo: "nueva" } | { tipo: "sinCita" } | { tipo: "reprogramar"; cita: Cita }

function crearEsquema(conHorario: boolean) {
  return z
    .object({
      medicoId: z.string().min(1, "seleccione el médico"),
      consultorioId: z.string().min(1, "seleccione el consultorio"),
      fecha: z.string(),
      hora: z.string(),
      motivo: z.string().trim().max(200, "máximo 200 caracteres"),
    })
    .superRefine((d, ctx) => {
      if (!conHorario) return
      if (!d.fecha)
        ctx.addIssue({
          code: "custom",
          path: ["fecha"],
          message: "obligatorio",
        })
      else if (d.fecha < hoyISO())
        ctx.addIssue({
          code: "custom",
          path: ["fecha"],
          message: "no puede ser una fecha pasada",
        })
      if (!d.hora)
        ctx.addIssue({ code: "custom", path: ["hora"], message: "obligatorio" })
    })
}

type Datos = z.infer<ReturnType<typeof crearEsquema>>

export function FormularioCita({
  modo,
  medicos,
  consultorios,
  alGuardar,
  alCancelar,
}: {
  modo: ModoCita
  medicos: Medico[]
  consultorios: Consultorio[]
  alGuardar: (c: Cita) => void
  alCancelar: () => void
}) {
  const reprogramando = modo.tipo === "reprogramar" ? modo.cita : null
  const conHorario = modo.tipo !== "sinCita"
  const [paciente, setPaciente] = React.useState<PacienteResumen | null>(null)
  const [errorPaciente, setErrorPaciente] = React.useState<string>()
  const [error, setError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({
    resolver: zodResolver(crearEsquema(conHorario)),
    defaultValues: reprogramando
      ? {
          medicoId: String(reprogramando.medico.id),
          consultorioId: String(reprogramando.consultorio.id),
          fecha: reprogramando.fecha,
          hora: formatearHora(reprogramando.hora),
          motivo: reprogramando.motivo ?? "",
        }
      : {
          medicoId: "",
          consultorioId: "",
          fecha: hoyISO(),
          hora: "",
          motivo: "",
        },
  })

  async function enviar(d: Datos) {
    setError(null)
    const pacienteId = reprogramando?.paciente.id ?? paciente?.id
    if (!pacienteId) {
      setErrorPaciente("seleccione el paciente")
      return
    }
    const cuerpo = {
      pacienteId,
      medicoId: Number(d.medicoId),
      consultorioId: Number(d.consultorioId),
      motivo: d.motivo || null,
      ...(conHorario && { fecha: d.fecha, hora: d.hora }),
    }
    try {
      const ruta =
        modo.tipo === "sinCita"
          ? "/api/citas/sin-cita"
          : reprogramando
            ? `/api/citas/${reprogramando.id}`
            : "/api/citas"
      alGuardar(
        await api<Cita>(ruta, {
          method: reprogramando ? "PUT" : "POST",
          ...json(cuerpo),
        })
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar")
    }
  }

  const titulo = {
    nueva: "Programar cita",
    sinCita: "Llegada sin cita",
    reprogramar: "Reprogramar cita",
  }[modo.tipo]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-4"
          noValidate
        >
          {error && <Alerta>{error}</Alerta>}
          {modo.tipo === "sinCita" && (
            <Alerta tipo="info">
              El paciente quedará registrado para hoy y pasará directamente a la
              cola de triaje.
            </Alerta>
          )}

          <Campo label="Paciente">
            {reprogramando ? (
              <div className="rounded-md border px-3 py-2 text-sm">
                <span className="font-mono text-muted-foreground">
                  {reprogramando.paciente.numeroHc}
                </span>{" "}
                <b>{reprogramando.paciente.nombreCompleto}</b>
              </div>
            ) : (
              <BuscadorPaciente
                seleccionado={paciente}
                alElegir={(p) => {
                  setPaciente(p)
                  setErrorPaciente(undefined)
                }}
                error={errorPaciente}
              />
            )}
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Médico" error={errors.medicoId?.message}>
              <Select {...register("medicoId")}>
                <option value="">Seleccione…</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreCompleto}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Consultorio" error={errors.consultorioId?.message}>
              <Select {...register("consultorioId")}>
                <option value="">Seleccione…</option>
                {consultorios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {c.especialidad}
                  </option>
                ))}
              </Select>
            </Campo>
            {conHorario && (
              <>
                <Campo label="Fecha" error={errors.fecha?.message}>
                  <Input type="date" min={hoyISO()} {...register("fecha")} />
                </Campo>
                <Campo label="Hora" error={errors.hora?.message}>
                  <Input type="time" step={300} {...register("hora")} />
                </Campo>
              </>
            )}
          </div>

          <Campo label="Motivo (opcional)" error={errors.motivo?.message}>
            <Input
              {...register("motivo")}
              placeholder="ej. control, resultados, primera consulta"
            />
          </Campo>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando…"
                : modo.tipo === "sinCita"
                  ? "Registrar llegada"
                  : "Guardar cita"}
            </Button>
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
