import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Activity,
  ClipboardPlus,
  FileText,
  NotebookPen,
  Pill,
  Save,
  ShieldAlert,
  Signature,
  Stethoscope,
  TriangleAlert,
  X,
} from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select, Textarea } from "@/components/form"
import { EncabezadoPagina, SeccionTarjeta } from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api, json } from "@/lib/api"
import {
  NOMBRE_VIA,
  type Atencion,
  type Cie10,
  type MedicamentoCatalogo,
  type Triaje,
  type ViaAdministracion,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"
import { PanelDocumentos } from "@/pages/documentos/PanelDocumentos"
import { PanelAlergias } from "@/pages/triaje/PanelAlergias"
import { TriajeResumen } from "@/pages/triaje/TriajeResumen"

import { AtencionDetalle } from "./AtencionDetalle"
import { BuscadorCatalogo } from "./BuscadorCatalogo"
import { HistoriaClinica } from "./HistoriaClinica"

const texto = (max: number) =>
  z.string().trim().max(max, `máximo ${max} caracteres`)

const esquema = z.object({
  motivoConsulta: texto(500).min(1, "obligatorio"),
  tiempoEnfermedad: texto(60),
  anamnesis: texto(4000),
  examenFisico: texto(4000),
  planTrabajo: texto(2000),
  indicaciones: texto(2000),
  diagnosticos: z.array(
    z.object({
      codigo: z.string(),
      descripcion: z.string(),
      tipo: z.enum(["PRESUNTIVO", "DEFINITIVO"]),
      principal: z.boolean(),
    })
  ),
  receta: z.array(
    z.object({
      medicamentoId: z.number(),
      medicamento: z.string(),
      dosis: texto(60).min(1, "obligatorio"),
      via: z.string(),
      frecuencia: texto(60).min(1, "obligatorio"),
      duracion: texto(60).min(1, "obligatorio"),
      cantidad: z
        .string()
        .trim()
        .refine(
          (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 999,
          "entre 1 y 999"
        ),
      indicaciones: texto(200),
      confirmarAlergia: z.boolean(),
      justificacionAlergia: texto(300),
    })
  ),
})

type Datos = z.infer<typeof esquema>

function desdeAtencion(a: Atencion): Datos {
  return {
    motivoConsulta: a.motivoConsulta,
    tiempoEnfermedad: a.tiempoEnfermedad ?? "",
    anamnesis: a.anamnesis ?? "",
    examenFisico: a.examenFisico ?? "",
    planTrabajo: a.planTrabajo ?? "",
    indicaciones: a.indicaciones ?? "",
    diagnosticos: a.diagnosticos.map((d) => ({ ...d })),
    receta: a.receta.map((r) => ({
      medicamentoId: r.medicamentoId,
      medicamento: r.medicamento,
      dosis: r.dosis,
      via: r.via,
      frecuencia: r.frecuencia,
      duracion: r.duracion,
      cantidad: String(r.cantidad),
      indicaciones: r.indicaciones ?? "",
      confirmarAlergia: r.alergiaConfirmada,
      justificacionAlergia: r.justificacionAlergia ?? "",
    })),
  }
}

function aPayload(d: Datos) {
  const nulo = (v: string) => v.trim() || null
  return {
    motivoConsulta: d.motivoConsulta,
    tiempoEnfermedad: nulo(d.tiempoEnfermedad),
    anamnesis: nulo(d.anamnesis),
    examenFisico: nulo(d.examenFisico),
    planTrabajo: nulo(d.planTrabajo),
    indicaciones: nulo(d.indicaciones),
    diagnosticos: d.diagnosticos.map(({ codigo, tipo, principal }) => ({
      codigo,
      tipo,
      principal,
    })),
    receta: d.receta.map((r) => ({
      medicamentoId: r.medicamentoId,
      dosis: r.dosis,
      via: r.via,
      frecuencia: r.frecuencia,
      duracion: r.duracion,
      cantidad: Number(r.cantidad),
      indicaciones: nulo(r.indicaciones),
      confirmarAlergia: r.confirmarAlergia,
      justificacionAlergia: nulo(r.justificacionAlergia),
    })),
  }
}

/**
 * Atención médica (plan.md, sección 5.4): borrador editable por su médico hasta que la firma.
 */
export function AtencionPage({
  atencion: inicial,
  alVolver,
}: {
  atencion: Atencion
  alVolver: () => void
}) {
  const [atencion, setAtencion] = React.useState(inicial)
  const p = atencion.paciente
  const cerrada = atencion.estado === "CERRADA"

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        alVolver={alVolver}
        textoVolver="Volver a mis pacientes"
        titulo={p.nombreCompleto}
        descripcion={
          <>
            Atención médica · <span className="font-mono">{p.numeroHc}</span> ·{" "}
            {p.edad} · {p.sexo === "FEMENINO" ? "Femenino" : "Masculino"}
          </>
        }
        acciones={
          cerrada ? (
            <Badge className="bg-green-600/12 text-green-700 dark:text-green-400">
              <Signature />
              Firmada
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-400">
              <NotebookPen />
              Borrador
            </Badge>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {cerrada ? (
            <SeccionTarjeta icono={Signature} titulo="Atención firmada">
              <AtencionDetalle atencion={atencion} alActualizar={setAtencion} />
            </SeccionTarjeta>
          ) : (
            <EditorAtencion
              atencion={atencion}
              alGuardar={(a, firmada) => {
                setAtencion(a)
                if (firmada)
                  toast.success("Atención firmada", {
                    description:
                      "Ya no se puede modificar; las correcciones se agregan como adendas.",
                  })
                else toast.success("Borrador guardado")
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <TriajeDeLaCita citaId={atencion.citaId} />
          <SeccionTarjeta icono={ShieldAlert} titulo="Alergias">
            <PanelAlergias pacienteId={p.id} />
          </SeccionTarjeta>
          <SeccionTarjeta icono={FileText} titulo="Documentos">
            <PanelDocumentos pacienteId={p.id} citaId={atencion.citaId} />
          </SeccionTarjeta>
          <HistoriaClinica pacienteId={p.id} excluirId={atencion.id} />
        </div>
      </div>
    </div>
  )
}

function TriajeDeLaCita({ citaId }: { citaId: number }) {
  const { datos } = useApi<Triaje>(`/api/citas/${citaId}/triaje`)
  return (
    <SeccionTarjeta icono={Activity} titulo="Triaje">
      {datos ? (
        <TriajeResumen triaje={datos} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}
    </SeccionTarjeta>
  )
}

function EditorAtencion({
  atencion,
  alGuardar,
}: {
  atencion: Atencion
  alGuardar: (a: Atencion, cerrada: boolean) => void
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: desdeAtencion(atencion),
  })
  const diagnosticos = useFieldArray({ control, name: "diagnosticos" })
  const receta = useFieldArray({ control, name: "receta" })
  const [error, setError] = React.useState<string | null>(null)
  // Alertas de alergia devueltas por el backend, por posición en la receta
  const [alertasAlergia, setAlertasAlergia] = React.useState<
    Record<number, string>
  >({})

  const { confirmar } = useConfirmacion()

  async function enviar(d: Datos, cerrar: boolean) {
    setError(null)
    if (
      cerrar &&
      !(await confirmar({
        titulo: "¿Firmar y cerrar la atención?",
        descripcion:
          "Después no podrá modificarse; las correcciones se agregan como adendas.",
        accion: "Firmar y cerrar",
      }))
    )
      return
    try {
      const a = await api<Atencion>(
        `/api/atenciones/${atencion.id}${cerrar ? "/cierre" : ""}`,
        {
          method: cerrar ? "POST" : "PUT",
          ...json(aPayload(d)),
        }
      )
      setAlertasAlergia({})
      alGuardar(a, cerrar)
    } catch (e) {
      if (e instanceof ApiError && e.codigo === "ALERGIA_MEDICAMENTO") {
        const porIndice: Record<number, string> = {}
        for (const [clave, detalle] of Object.entries(e.errores)) {
          const i = Number(/receta\[(\d+)\]/.exec(clave)?.[1])
          if (!Number.isNaN(i)) porIndice[i] = detalle
        }
        setAlertasAlergia(porIndice)
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : "No se pudo guardar")
      }
    }
  }

  function marcarPrincipal(indice: number) {
    getValues("diagnosticos").forEach((_, i) =>
      setValue(`diagnosticos.${i}.principal`, i === indice)
    )
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => e.preventDefault()}
    >
      {error && <Alerta>{error}</Alerta>}

      <SeccionTarjeta icono={Stethoscope} titulo="Anamnesis y examen">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Campo
              label="Motivo de consulta"
              error={errors.motivoConsulta?.message}
            >
              <Input {...register("motivoConsulta")} />
            </Campo>
          </div>
          <Campo
            label="Tiempo de enfermedad"
            error={errors.tiempoEnfermedad?.message}
          >
            <Input {...register("tiempoEnfermedad")} placeholder="ej. 3 días" />
          </Campo>
        </div>
        <Campo
          label="Anamnesis (relato, síntomas, antecedentes relevantes)"
          error={errors.anamnesis?.message}
        >
          <Textarea {...register("anamnesis")} rows={4} />
        </Campo>
        <Campo label="Examen físico" error={errors.examenFisico?.message}>
          <Textarea {...register("examenFisico")} rows={4} />
        </Campo>
      </SeccionTarjeta>

      <SeccionTarjeta
        icono={ClipboardPlus}
        titulo="Diagnósticos (CIE-10)"
        descripcion="El marcado como principal encabeza la atención."
      >
        {diagnosticos.fields.length > 0 && (
          <ul className="flex flex-col gap-2">
            {diagnosticos.fields.map((f, i) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm has-[input[type=radio]:checked]:border-marca has-[input[type=radio]:checked]:bg-marca-claro/40 dark:has-[input[type=radio]:checked]:bg-muted/60"
              >
                <Badge variant="outline" className="font-mono">
                  {f.codigo}
                </Badge>
                <span className="min-w-40 flex-1">{f.descripcion}</span>
                <Select
                  className="w-36"
                  {...register(`diagnosticos.${i}.tipo`)}
                >
                  <option value="PRESUNTIVO">Presuntivo</option>
                  <option value="DEFINITIVO">Definitivo</option>
                </Select>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
                  <input
                    type="radio"
                    name="diagnostico-principal"
                    defaultChecked={f.principal}
                    onChange={() => marcarPrincipal(i)}
                  />
                  Principal
                </label>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Quitar ${f.codigo}`}
                  onClick={() => diagnosticos.remove(i)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <BuscadorCatalogo<Cie10>
          ruta="/api/cie10"
          placeholder="Agregar diagnóstico: busque por código (J02) o nombre (faringitis)…"
          clave={(c) => c.codigo}
          etiqueta={(c) => (
            <>
              <span className="font-mono text-marca">{c.codigo}</span>{" "}
              {c.descripcion}
            </>
          )}
          alElegir={(c) => {
            if (getValues("diagnosticos").some((d) => d.codigo === c.codigo))
              return
            diagnosticos.append({
              codigo: c.codigo,
              descripcion: c.descripcion,
              tipo: "PRESUNTIVO",
              // El primero que se agrega queda como principal
              principal: getValues("diagnosticos").length === 0,
            })
          }}
        />
      </SeccionTarjeta>

      <SeccionTarjeta
        icono={Pill}
        titulo="Receta"
        descripcion="Al guardar, el sistema verifica cada medicamento contra las alergias registradas del paciente."
      >
        {receta.fields.map((f, i) => {
          const e = errors.receta?.[i]
          return (
            <div
              key={f.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border border-l-4 border-l-marca bg-card p-3 text-sm",
                alertasAlergia[i] && "border-destructive border-l-destructive"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <Pill className="size-4 text-marca" aria-hidden />
                  {f.medicamento}
                </span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Quitar ${f.medicamento}`}
                  onClick={() => {
                    receta.remove(i)
                    // Las alertas son por posición: al quitar un ítem se descartan y se recalculan al guardar
                    setAlertasAlergia({})
                  }}
                >
                  <X />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Campo label="Dosis" error={e?.dosis?.message}>
                  <Input
                    {...register(`receta.${i}.dosis`)}
                    placeholder="1 tableta"
                  />
                </Campo>
                <Campo label="Vía">
                  <Select {...register(`receta.${i}.via`)}>
                    {(Object.keys(NOMBRE_VIA) as ViaAdministracion[]).map(
                      (v) => (
                        <option key={v} value={v}>
                          {NOMBRE_VIA[v]}
                        </option>
                      )
                    )}
                  </Select>
                </Campo>
                <Campo label="Frecuencia" error={e?.frecuencia?.message}>
                  <Input
                    {...register(`receta.${i}.frecuencia`)}
                    placeholder="cada 8 horas"
                  />
                </Campo>
                <Campo label="Duración" error={e?.duracion?.message}>
                  <Input
                    {...register(`receta.${i}.duracion`)}
                    placeholder="5 días"
                  />
                </Campo>
                <Campo label="Cantidad" error={e?.cantidad?.message}>
                  <Input
                    {...register(`receta.${i}.cantidad`)}
                    inputMode="numeric"
                  />
                </Campo>
              </div>
              <Input
                {...register(`receta.${i}.indicaciones`)}
                placeholder="Indicaciones (opcional): después de comer…"
              />
              {alertasAlergia[i] && (
                <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3">
                  <p className="flex items-start gap-2 font-medium text-destructive">
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    {alertasAlergia[i]}
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      {...register(`receta.${i}.confirmarAlergia`)}
                    />
                    Conozco la alerta y decido recetarlo
                  </label>
                  <Input
                    {...register(`receta.${i}.justificacionAlergia`)}
                    placeholder="Justificación clínica (obligatoria para recetarlo)"
                  />
                </div>
              )}
            </div>
          )
        })}
        <BuscadorCatalogo<MedicamentoCatalogo>
          ruta="/api/medicamentos"
          placeholder="Agregar medicamento: busque por nombre (amoxicilina, paracetamol)…"
          clave={(m) => m.id}
          etiqueta={(m) => m.descripcion}
          alElegir={(m) => {
            if (getValues("receta").some((r) => r.medicamentoId === m.id))
              return
            receta.append({
              medicamentoId: m.id,
              medicamento: m.descripcion,
              dosis: "",
              via: "ORAL",
              frecuencia: "",
              duracion: "",
              cantidad: "",
              indicaciones: "",
              confirmarAlergia: false,
              justificacionAlergia: "",
            })
          }}
        />
      </SeccionTarjeta>

      <SeccionTarjeta icono={NotebookPen} titulo="Plan e indicaciones">
        <Campo
          label="Plan de trabajo (exámenes auxiliares, interconsultas, control)"
          error={errors.planTrabajo?.message}
        >
          <Textarea {...register("planTrabajo")} />
        </Campo>
        <Campo
          label="Indicaciones al paciente"
          error={errors.indicaciones?.message}
        >
          <Textarea {...register("indicaciones")} />
        </Campo>
      </SeccionTarjeta>

      {/* Barra de acciones fija al pie mientras se escribe */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <span className="mr-auto hidden text-xs text-muted-foreground sm:block">
          Guarde el borrador cuantas veces quiera; al firmar ya no se puede
          editar.
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={handleSubmit((d) => enviar(d, false))}
        >
          <Save />
          Guardar borrador
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((d) => enviar(d, true))}
        >
          <Signature />
          {isSubmitting ? "Guardando…" : "Firmar y cerrar atención"}
        </Button>
      </div>
    </form>
  )
}
