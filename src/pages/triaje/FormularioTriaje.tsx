import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Path } from "react-hook-form"
import { z } from "zod"

import { Alerta, Campo, Input, Select } from "@/components/form"
import { ListaAlertas, PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api, json } from "@/lib/api"
import {
  NIVEL_PRIORIDAD,
  NOMBRE_PRIORIDAD,
  type Cita,
  type Evaluacion,
  type Prioridad,
  type Triaje,
} from "@/lib/types"
import { useApi, useDebounce } from "@/lib/useApi"

import { PanelAlergias } from "./PanelAlergias"
import { TriajeResumen } from "./TriajeResumen"

/** Número escrito en un input: acepta coma decimal ("36,8"). Vacío = no registrado. */
function numero(
  min: number,
  max: number,
  { requerido = false, entero = false } = {}
) {
  return z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === "") {
        if (requerido) ctx.addIssue({ code: "custom", message: "obligatorio" })
        return
      }
      const n = Number(v.replace(",", "."))
      if (Number.isNaN(n))
        ctx.addIssue({ code: "custom", message: "número inválido" })
      else if (entero && !Number.isInteger(n))
        ctx.addIssue({ code: "custom", message: "sin decimales" })
      else if (n < min || n > max)
        ctx.addIssue({ code: "custom", message: `entre ${min} y ${max}` })
    })
}

// Los mismos rangos que el backend (TriajeRequest): rechazan errores de digitación, no valores anormales.
const esquema = z
  .object({
    motivoConsulta: z.string().trim().min(1, "obligatorio").max(500),
    presionSistolica: numero(40, 300, { entero: true }),
    presionDiastolica: numero(20, 200, { entero: true }),
    frecuenciaCardiaca: numero(20, 250, { requerido: true, entero: true }),
    frecuenciaRespiratoria: numero(4, 80, { entero: true }),
    temperatura: numero(30, 45, { requerido: true }),
    saturacion: numero(50, 100, { requerido: true, entero: true }),
    peso: numero(0.3, 400, { requerido: true }),
    talla: numero(20, 250),
    perimetroAbdominal: numero(20, 250),
    gestante: z.boolean(),
    discapacidad: z.boolean(),
    prioridad: z.string(),
    justificacionPrioridad: z.string().trim().max(300),
    observaciones: z.string().trim().max(500),
  })
  .superRefine((d, ctx) => {
    if ((d.presionSistolica === "") !== (d.presionDiastolica === "")) {
      ctx.addIssue({
        code: "custom",
        path: [
          d.presionSistolica === "" ? "presionSistolica" : "presionDiastolica",
        ],
        message: "registre ambas o ninguna",
      })
    } else if (
      d.presionSistolica !== "" &&
      Number(d.presionSistolica) <= Number(d.presionDiastolica)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["presionDiastolica"],
        message: "debe ser menor que la sistólica",
      })
    }
  })

type Datos = z.infer<typeof esquema>

const VACIO: Datos = {
  motivoConsulta: "",
  presionSistolica: "",
  presionDiastolica: "",
  frecuenciaCardiaca: "",
  frecuenciaRespiratoria: "",
  temperatura: "",
  saturacion: "",
  peso: "",
  talla: "",
  perimetroAbdominal: "",
  gestante: false,
  discapacidad: false,
  prioridad: "",
  justificacionPrioridad: "",
  observaciones: "",
}

const num = (v: string) =>
  v.trim() === "" ? null : Number(v.replace(",", "."))

function aPayload(d: Datos) {
  return {
    motivoConsulta: d.motivoConsulta.trim(),
    presionSistolica: num(d.presionSistolica),
    presionDiastolica: num(d.presionDiastolica),
    frecuenciaCardiaca: num(d.frecuenciaCardiaca),
    frecuenciaRespiratoria: num(d.frecuenciaRespiratoria),
    temperatura: num(d.temperatura),
    saturacion: num(d.saturacion),
    peso: num(d.peso),
    talla: num(d.talla),
    perimetroAbdominal: num(d.perimetroAbdominal),
    gestante: d.gestante,
    discapacidad: d.discapacidad,
    prioridad: d.prioridad || null,
    justificacionPrioridad: d.justificacionPrioridad.trim() || null,
    observaciones: d.observaciones.trim() || null,
  }
}

export function FormularioTriaje({
  cita,
  alGuardar,
  alCancelar,
}: {
  cita: Cita
  alGuardar: (t: Triaje) => void
  alCancelar: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: VACIO })
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null)

  // --- Vista previa de la evaluación (alertas, IMC y prioridad sugerida), calculada por el backend ---
  const valores = useWatch({ control })
  const validado = esquema.safeParse(valores)
  const claveActual = validado.success
    ? JSON.stringify(aPayload(validado.data))
    : ""
  const clave = useDebounce(claveActual, 400)
  const [vista, setVista] = React.useState<{
    clave: string
    evaluacion?: Evaluacion
    error?: string
  }>()

  React.useEffect(() => {
    if (!clave) return
    let vigente = true
    api<Evaluacion>(`/api/citas/${cita.id}/triaje/evaluacion`, {
      method: "POST",
      body: clave,
    })
      .then((evaluacion) => vigente && setVista({ clave, evaluacion }))
      .catch(
        (e: unknown) =>
          vigente &&
          setVista({ clave, error: e instanceof Error ? e.message : "Error" })
      )
    return () => {
      vigente = false
    }
  }, [clave, cita.id])

  // Solo se muestra si corresponde a los datos actuales del formulario
  const evaluacion = vista?.clave === claveActual ? vista.evaluacion : undefined
  const errorEvaluacion = vista?.clave === claveActual ? vista.error : undefined
  const prioridadElegida = (valores.prioridad ||
    evaluacion?.prioridadSugerida) as Prioridad | undefined
  const bajaPrioridad =
    !!evaluacion &&
    !!prioridadElegida &&
    NIVEL_PRIORIDAD[prioridadElegida] <
      NIVEL_PRIORIDAD[evaluacion.prioridadSugerida]

  async function enviar(d: Datos) {
    setErrorGeneral(null)
    if (bajaPrioridad && !d.justificacionPrioridad.trim()) {
      setError("justificacionPrioridad", {
        message: "justifique por qué asigna una prioridad menor a la sugerida",
      })
      return
    }
    try {
      alGuardar(
        await api<Triaje>(`/api/citas/${cita.id}/triaje`, {
          method: "POST",
          ...json(aPayload(d)),
        })
      )
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorGeneral(e.message)
        for (const [campo, mensaje] of Object.entries(e.errores)) {
          setError(campo as Path<Datos>, { message: mensaje })
        }
      } else {
        setErrorGeneral("No se pudo registrar el triaje")
      }
    }
  }

  const p = cita.paciente
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            Turno {cita.numeroTurno} · {cita.consultorio.nombre} ·{" "}
            {cita.medico.nombreCompleto}
          </p>
          <h1 className="text-2xl font-semibold">{p.nombreCompleto}</h1>
          <p className="text-muted-foreground">
            {p.numeroHc} · {p.edad} ·{" "}
            {p.sexo === "FEMENINO" ? "Femenino" : "Masculino"}
            {cita.motivo && ` · Motivo de la cita: ${cita.motivo}`}
          </p>
        </div>
        <Button variant="ghost" onClick={alCancelar}>
          ← Volver a la cola
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Triaje</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(enviar)}
              className="flex flex-col gap-5"
              noValidate
            >
              {errorGeneral && <Alerta>{errorGeneral}</Alerta>}

              <Campo
                label="Motivo de consulta (lo que relata el paciente)"
                error={errors.motivoConsulta?.message}
              >
                <Input {...register("motivoConsulta")} autoFocus />
              </Campo>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Campo
                  label="PA sistólica (mmHg)"
                  error={errors.presionSistolica?.message}
                >
                  <Input
                    {...register("presionSistolica")}
                    inputMode="numeric"
                  />
                </Campo>
                <Campo
                  label="PA diastólica (mmHg)"
                  error={errors.presionDiastolica?.message}
                >
                  <Input
                    {...register("presionDiastolica")}
                    inputMode="numeric"
                  />
                </Campo>
                <Campo
                  label="FC (lpm) *"
                  error={errors.frecuenciaCardiaca?.message}
                >
                  <Input
                    {...register("frecuenciaCardiaca")}
                    inputMode="numeric"
                  />
                </Campo>
                <Campo
                  label="FR (rpm)"
                  error={errors.frecuenciaRespiratoria?.message}
                >
                  <Input
                    {...register("frecuenciaRespiratoria")}
                    inputMode="numeric"
                  />
                </Campo>
                <Campo
                  label="Temperatura (°C) *"
                  error={errors.temperatura?.message}
                >
                  <Input {...register("temperatura")} inputMode="decimal" />
                </Campo>
                <Campo
                  label="Saturación O₂ (%) *"
                  error={errors.saturacion?.message}
                >
                  <Input {...register("saturacion")} inputMode="numeric" />
                </Campo>
                <Campo label="Peso (kg) *" error={errors.peso?.message}>
                  <Input {...register("peso")} inputMode="decimal" />
                </Campo>
                <Campo label="Talla (cm)" error={errors.talla?.message}>
                  <Input {...register("talla")} inputMode="decimal" />
                </Campo>
                <Campo
                  label="Perímetro abd. (cm)"
                  error={errors.perimetroAbdominal?.message}
                >
                  <Input
                    {...register("perimetroAbdominal")}
                    inputMode="decimal"
                  />
                </Campo>
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                {p.sexo === "FEMENINO" && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      {...register("gestante")}
                    />
                    Gestante
                  </label>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    {...register("discapacidad")}
                  />
                  Persona con discapacidad
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Prioridad">
                  <Select {...register("prioridad")}>
                    <option value="">
                      {evaluacion
                        ? `Usar la sugerida (${NOMBRE_PRIORIDAD[evaluacion.prioridadSugerida]})`
                        : "Usar la sugerida por el sistema"}
                    </option>
                    {(Object.keys(NOMBRE_PRIORIDAD) as Prioridad[]).map(
                      (pr) => (
                        <option key={pr} value={pr}>
                          {NOMBRE_PRIORIDAD[pr]}
                        </option>
                      )
                    )}
                  </Select>
                </Campo>
                {bajaPrioridad && (
                  <Campo
                    label="Justificación (obligatoria)"
                    error={errors.justificacionPrioridad?.message}
                  >
                    <Input
                      {...register("justificacionPrioridad")}
                      placeholder="ej. saturación habitual del paciente con EPOC"
                    />
                  </Campo>
                )}
              </div>

              <Campo
                label="Observaciones (opcional)"
                error={errors.observaciones?.message}
              >
                <Input {...register("observaciones")} />
              </Campo>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Guardando…"
                    : "Registrar triaje y enviar al médico"}
                </Button>
                <Button type="button" variant="outline" onClick={alCancelar}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluación</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {!claveActual && (
                <p className="text-muted-foreground">
                  Complete los campos obligatorios (*) para ver las alertas.
                </p>
              )}
              {errorEvaluacion && <Alerta>{errorEvaluacion}</Alerta>}
              {claveActual && !evaluacion && !errorEvaluacion && (
                <p className="text-muted-foreground">Evaluando…</p>
              )}
              {evaluacion && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Prioridad sugerida:
                    </span>
                    <PrioridadEtiqueta
                      prioridad={evaluacion.prioridadSugerida}
                    />
                  </div>
                  {evaluacion.imc && (
                    <p>
                      <span className="text-muted-foreground">IMC: </span>
                      <b>{evaluacion.imc}</b>
                    </p>
                  )}
                  <ListaAlertas alertas={evaluacion.alertas} />
                  {evaluacion.prioridadSugerida === "URGENTE" && (
                    <Alerta>
                      Signos vitales de riesgo: evalúe la derivación a
                      emergencia.
                    </Alerta>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alergias</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelAlergias pacienteId={p.id} />
            </CardContent>
          </Card>

          <UltimoTriaje pacienteId={p.id} />
        </div>
      </div>
    </div>
  )
}

/** Triaje anterior del paciente, para comparar (por ejemplo, el peso o la presión de la vez pasada). */
function UltimoTriaje({ pacienteId }: { pacienteId: number }) {
  const { datos } = useApi<Triaje[]>(`/api/pacientes/${pacienteId}/triajes`)
  const ultimo = datos?.[0]
  if (!ultimo) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Triaje anterior</CardTitle>
      </CardHeader>
      <CardContent>
        <TriajeResumen triaje={ultimo} />
      </CardContent>
    </Card>
  )
}
