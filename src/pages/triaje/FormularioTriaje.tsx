import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Path } from "react-hook-form"
import { z } from "zod"

import {
  Accessibility,
  Activity,
  Baby,
  ClipboardList,
  Gauge,
  History,
  Send,
  ShieldAlert,
  Siren,
  Weight,
} from "lucide-react"

import { Alerta, Campo, Input, Select } from "@/components/form"
import { EncabezadoPagina, SeccionTarjeta } from "@/components/pagina"
import { ListaAlertas, PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { cn } from "@/lib/utils"

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
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        alVolver={alCancelar}
        textoVolver="Volver a la cola"
        titulo={p.nombreCompleto}
        descripcion={
          <>
            <span className="font-mono">{p.numeroHc}</span> · {p.edad} ·{" "}
            {p.sexo === "FEMENINO" ? "Femenino" : "Masculino"} · Turno{" "}
            {cita.numeroTurno} · {cita.consultorio.nombre} ·{" "}
            {cita.medico.nombreCompleto}
            {cita.motivo && ` · Motivo de la cita: ${cita.motivo}`}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-6 lg:col-span-2"
          noValidate
        >
          {errorGeneral && <Alerta>{errorGeneral}</Alerta>}

          <SeccionTarjeta icono={ClipboardList} titulo="Motivo de consulta">
            <Campo
              label="Lo que relata el paciente"
              error={errors.motivoConsulta?.message}
            >
              <Input {...register("motivoConsulta")} autoFocus />
            </Campo>
          </SeccionTarjeta>

          <SeccionTarjeta
            icono={Activity}
            titulo="Signos vitales"
            descripcion="Los campos con * son obligatorios. Acepta coma decimal (36,8)."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Campo
                label="PA sistólica"
                error={errors.presionSistolica?.message}
              >
                <ConUnidad unidad="mmHg">
                  <Input
                    {...register("presionSistolica")}
                    inputMode="numeric"
                  />
                </ConUnidad>
              </Campo>
              <Campo
                label="PA diastólica"
                error={errors.presionDiastolica?.message}
              >
                <ConUnidad unidad="mmHg">
                  <Input
                    {...register("presionDiastolica")}
                    inputMode="numeric"
                  />
                </ConUnidad>
              </Campo>
              <Campo
                label="Frec. cardiaca *"
                error={errors.frecuenciaCardiaca?.message}
              >
                <ConUnidad unidad="lpm">
                  <Input
                    {...register("frecuenciaCardiaca")}
                    inputMode="numeric"
                  />
                </ConUnidad>
              </Campo>
              <Campo
                label="Frec. respiratoria"
                error={errors.frecuenciaRespiratoria?.message}
              >
                <ConUnidad unidad="rpm">
                  <Input
                    {...register("frecuenciaRespiratoria")}
                    inputMode="numeric"
                  />
                </ConUnidad>
              </Campo>
              <Campo label="Temperatura *" error={errors.temperatura?.message}>
                <ConUnidad unidad="°C">
                  <Input {...register("temperatura")} inputMode="decimal" />
                </ConUnidad>
              </Campo>
              <Campo label="Saturación O₂ *" error={errors.saturacion?.message}>
                <ConUnidad unidad="%">
                  <Input {...register("saturacion")} inputMode="numeric" />
                </ConUnidad>
              </Campo>
            </div>
          </SeccionTarjeta>

          <SeccionTarjeta icono={Weight} titulo="Antropometría y condición">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Campo label="Peso *" error={errors.peso?.message}>
                <ConUnidad unidad="kg">
                  <Input {...register("peso")} inputMode="decimal" />
                </ConUnidad>
              </Campo>
              <Campo label="Talla" error={errors.talla?.message}>
                <ConUnidad unidad="cm">
                  <Input {...register("talla")} inputMode="decimal" />
                </ConUnidad>
              </Campo>
              <Campo
                label="Perímetro abdominal"
                error={errors.perimetroAbdominal?.message}
              >
                <ConUnidad unidad="cm">
                  <Input
                    {...register("perimetroAbdominal")}
                    inputMode="decimal"
                  />
                </ConUnidad>
              </Campo>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {p.sexo === "FEMENINO" && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 has-checked:border-marca has-checked:bg-marca-claro/60 dark:has-checked:bg-muted">
                  <input
                    type="checkbox"
                    className="size-4"
                    {...register("gestante")}
                  />
                  <Baby className="size-4 text-muted-foreground" aria-hidden />
                  Gestante
                </label>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 has-checked:border-marca has-checked:bg-marca-claro/60 dark:has-checked:bg-muted">
                <input
                  type="checkbox"
                  className="size-4"
                  {...register("discapacidad")}
                />
                <Accessibility
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                Persona con discapacidad
              </label>
            </div>
          </SeccionTarjeta>

          <SeccionTarjeta icono={Siren} titulo="Prioridad y observaciones">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Prioridad">
                <Select {...register("prioridad")}>
                  <option value="">
                    {evaluacion
                      ? `Usar la sugerida (${NOMBRE_PRIORIDAD[evaluacion.prioridadSugerida]})`
                      : "Usar la sugerida por el sistema"}
                  </option>
                  {(Object.keys(NOMBRE_PRIORIDAD) as Prioridad[]).map((pr) => (
                    <option key={pr} value={pr}>
                      {NOMBRE_PRIORIDAD[pr]}
                    </option>
                  ))}
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
          </SeccionTarjeta>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              <Send />
              {isSubmitting
                ? "Guardando…"
                : "Registrar triaje y enviar al médico"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={alCancelar}
            >
              Cancelar
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card
            className={cn(
              "border-t-4",
              evaluacion?.prioridadSugerida === "URGENTE"
                ? "border-t-destructive"
                : evaluacion?.prioridadSugerida === "PREFERENTE"
                  ? "border-t-amber-500"
                  : "border-t-marca"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4 text-marca" aria-hidden />
                Evaluación en tiempo real
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {!claveActual && (
                <p className="text-muted-foreground">
                  Complete los campos obligatorios (*) para ver las alertas.
                </p>
              )}
              {errorEvaluacion && <Alerta>{errorEvaluacion}</Alerta>}
              {claveActual && !evaluacion && !errorEvaluacion && (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
              {evaluacion && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Prioridad sugerida
                    </span>
                    <PrioridadEtiqueta
                      prioridad={evaluacion.prioridadSugerida}
                    />
                  </div>
                  {evaluacion.imc && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">IMC</span>
                      <span className="font-semibold tabular-nums">
                        {evaluacion.imc}
                      </span>
                    </div>
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
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-marca" aria-hidden />
                Alergias
              </CardTitle>
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

/** Muestra la unidad de medida dentro del campo, a la derecha. */
function ConUnidad({
  unidad,
  children,
}: {
  unidad: string
  children: React.ReactNode
}) {
  return (
    <div className="relative [&_input]:pr-14">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
        {unidad}
      </span>
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
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-marca" aria-hidden />
          Triaje anterior
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TriajeResumen triaje={ultimo} />
      </CardContent>
    </Card>
  )
}
