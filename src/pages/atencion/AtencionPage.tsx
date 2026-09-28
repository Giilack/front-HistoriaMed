import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { Alerta, Campo, Input, Select, Textarea } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [mensaje, setMensaje] = React.useState<string | null>(null)
  const p = atencion.paciente

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Atención médica</p>
          <h1 className="text-2xl font-semibold">{p.nombreCompleto}</h1>
          <p className="text-muted-foreground">
            {p.numeroHc} · {p.edad} ·{" "}
            {p.sexo === "FEMENINO" ? "Femenino" : "Masculino"}
          </p>
        </div>
        <Button variant="ghost" onClick={alVolver}>
          ← Volver a mis pacientes
        </Button>
      </div>

      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {atencion.estado === "CERRADA" ? (
            <Card>
              <CardHeader>
                <CardTitle>Atención firmada</CardTitle>
              </CardHeader>
              <CardContent>
                <AtencionDetalle
                  atencion={atencion}
                  alActualizar={setAtencion}
                />
              </CardContent>
            </Card>
          ) : (
            <EditorAtencion
              atencion={atencion}
              alGuardar={(a, cerrada) => {
                setAtencion(a)
                setMensaje(
                  cerrada
                    ? "Atención firmada. Ya no se puede modificar; las correcciones se agregan como adendas."
                    : "Borrador guardado."
                )
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <TriajeDeLaCita citaId={atencion.citaId} />
          <Card>
            <CardHeader>
              <CardTitle>Alergias</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelAlergias pacienteId={p.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelDocumentos pacienteId={p.id} citaId={atencion.citaId} />
            </CardContent>
          </Card>
          <HistoriaClinica pacienteId={p.id} excluirId={atencion.id} />
        </div>
      </div>
    </div>
  )
}

function TriajeDeLaCita({ citaId }: { citaId: number }) {
  const { datos } = useApi<Triaje>(`/api/citas/${citaId}/triaje`)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Triaje</CardTitle>
      </CardHeader>
      <CardContent>
        {datos ? (
          <TriajeResumen triaje={datos} />
        ) : (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}
      </CardContent>
    </Card>
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

  async function enviar(d: Datos, cerrar: boolean) {
    setError(null)
    if (
      cerrar &&
      !window.confirm(
        "¿Firmar y cerrar la atención? Después no podrá modificarse, solo agregar adendas."
      )
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
    <Card>
      <CardHeader>
        <CardTitle>Atención en curso</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => e.preventDefault()}
        >
          {error && <Alerta>{error}</Alerta>}

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
              <Input
                {...register("tiempoEnfermedad")}
                placeholder="ej. 3 días"
              />
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

          {/* Diagnósticos */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Diagnósticos (CIE-10)</h3>
            {diagnosticos.fields.map((f, i) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-mono">{f.codigo}</span>
                <span className="min-w-40 flex-1">{f.descripcion}</span>
                <Select
                  className="w-36"
                  {...register(`diagnosticos.${i}.tipo`)}
                >
                  <option value="PRESUNTIVO">Presuntivo</option>
                  <option value="DEFINITIVO">Definitivo</option>
                </Select>
                <label className="flex items-center gap-1 text-xs">
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
                  size="xs"
                  variant="ghost"
                  onClick={() => diagnosticos.remove(i)}
                >
                  Quitar
                </Button>
              </div>
            ))}
            <BuscadorCatalogo<Cie10>
              ruta="/api/cie10"
              placeholder="Agregar diagnóstico: busque por código (J02) o nombre (faringitis)…"
              clave={(c) => c.codigo}
              etiqueta={(c) => (
                <>
                  <span className="font-mono">{c.codigo}</span> {c.descripcion}
                </>
              )}
              alElegir={(c) => {
                if (
                  getValues("diagnosticos").some((d) => d.codigo === c.codigo)
                )
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
          </div>

          {/* Receta */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Receta</h3>
            {receta.fields.map((f, i) => {
              const e = errors.receta?.[i]
              return (
                <div
                  key={f.id}
                  className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${alertasAlergia[i] ? "border-destructive" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <b>{f.medicamento}</b>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        receta.remove(i)
                        // Las alertas son por posición: al quitar un ítem se descartan y se recalculan al guardar
                        setAlertasAlergia({})
                      }}
                    >
                      Quitar
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
                    <div className="flex flex-col gap-2 rounded-md bg-destructive/10 p-2">
                      <p className="font-medium text-destructive">
                        ⚠ {alertasAlergia[i]}
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
            <p className="text-xs text-muted-foreground">
              Al guardar, el sistema verifica cada medicamento contra las
              alergias registradas del paciente.
            </p>
          </div>

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

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((d) => enviar(d, false))}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((d) => enviar(d, true))}
            >
              {isSubmitting ? "Guardando…" : "Firmar y cerrar atención"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
