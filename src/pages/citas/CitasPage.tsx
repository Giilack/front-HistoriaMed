import * as React from "react"

import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { api, json } from "@/lib/api"
import { formatearFecha, formatearHora, horaDe, hoyISO } from "@/lib/fechas"
import type { Cita, Consultorio, Medico } from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"

import { FormularioCita, type ModoCita } from "./FormularioCita"

/**
 * Agenda de ADMISION: programar citas, registrar llegadas (con o sin cita), reprogramar y cancelar.
 * Reglas en plan.md, sección 4.
 */
export function CitasPage() {
  const [fecha, setFecha] = React.useState(hoyISO())
  const [consultorioId, setConsultorioId] = React.useState("")
  const [medicoId, setMedicoId] = React.useState("")
  const [formulario, setFormulario] = React.useState<ModoCita | null>(null)
  const [mensaje, setMensaje] = React.useState<string | null>(null)
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null)

  const { datos: medicos } = useApi<Medico[]>("/api/usuarios/medicos")
  const { datos: consultorios } = useApi<Consultorio[]>("/api/consultorios")

  const params = new URLSearchParams({ fecha })
  if (consultorioId) params.set("consultorioId", consultorioId)
  if (medicoId) params.set("medicoId", medicoId)
  const {
    datos: citas,
    error: errorCarga,
    recargar,
  } = useApi<Cita[]>(`/api/citas?${params}`)
  // La agenda del día cambia con las acciones de triaje y del médico: se refresca cada 30 s
  useReloj(30_000, recargar)

  const esHoy = fecha === hoyISO()

  async function accion(
    c: Cita,
    ruta: string,
    confirmacion: string,
    cuerpo?: object,
    exito?: string
  ) {
    if (confirmacion && !window.confirm(confirmacion)) return
    setErrorAccion(null)
    setMensaje(null)
    try {
      await api(`/api/citas/${c.id}/${ruta}`, {
        method: "PATCH",
        ...(cuerpo && json(cuerpo)),
      })
      if (exito) setMensaje(exito)
      recargar()
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  function cancelar(c: Cita) {
    const motivo = window.prompt(
      `Motivo de la cancelación de la cita de ${c.paciente.nombreCompleto}:`
    )
    if (motivo === null) return
    void accion(c, "cancelar", "", { motivo })
  }

  const error = errorAccion ?? errorCarga

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Citas</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setFormulario({ tipo: "sinCita" })}
          >
            Llegada sin cita
          </Button>
          <Button onClick={() => setFormulario({ tipo: "nueva" })}>
            Programar cita
          </Button>
        </div>
      </div>

      {formulario && medicos && consultorios && (
        <FormularioCita
          key={
            formulario.tipo === "reprogramar"
              ? formulario.cita.id
              : formulario.tipo
          }
          modo={formulario}
          medicos={medicos}
          consultorios={consultorios}
          alCancelar={() => setFormulario(null)}
          alGuardar={(c) => {
            setFormulario(null)
            setErrorAccion(null)
            setMensaje(
              c.numeroTurno
                ? `${c.paciente.nombreCompleto} está en la cola de triaje con el turno ${c.numeroTurno}.`
                : `Cita de ${c.paciente.nombreCompleto} guardada para el ${formatearFecha(c.fecha)} a las ${formatearHora(c.hora)}.`
            )
            setFecha(c.fecha)
            recargar()
          }}
        />
      )}

      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      {error && <Alerta>{error}</Alerta>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          type="date"
          className="w-40"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
        />
        {!esHoy && (
          <Button size="sm" variant="ghost" onClick={() => setFecha(hoyISO())}>
            Hoy
          </Button>
        )}
        <Select
          className="w-56"
          value={consultorioId}
          onChange={(e) => setConsultorioId(e.target.value)}
        >
          <option value="">Todos los consultorios</option>
          {consultorios?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {c.especialidad}
            </option>
          ))}
        </Select>
        <Select
          className="w-56"
          value={medicoId}
          onChange={(e) => setMedicoId(e.target.value)}
        >
          <option value="">Todos los médicos</option>
          {medicos?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombreCompleto}
            </option>
          ))}
        </Select>
        <span className="text-muted-foreground">{formatearFecha(fecha)}</span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Hora</th>
              <th className="px-3 py-2 font-medium">Turno</th>
              <th className="px-3 py-2 font-medium">Paciente</th>
              <th className="px-3 py-2 font-medium">Médico · Consultorio</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citas?.map((c) => (
              <tr key={c.id} className="border-t align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {c.sinCita ? (
                    <span className="text-muted-foreground">Sin cita</span>
                  ) : (
                    formatearHora(c.hora)
                  )}
                </td>
                <td className="px-3 py-2">
                  {c.numeroTurno && <b>{c.numeroTurno}</b>}
                  {c.llegadaEn && (
                    <div className="text-xs text-muted-foreground">
                      llegó {horaDe(c.llegadaEn)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{c.paciente.nombreCompleto}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.paciente.numeroHc} · {c.paciente.edad}
                    {c.motivo && ` · ${c.motivo}`}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div>{c.medico.nombreCompleto}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.consultorio.nombre}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <EstadoCitaEtiqueta estado={c.estado} />
                  {c.motivoCancelacion && (
                    <div className="text-xs text-muted-foreground">
                      {c.motivoCancelacion}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.estado === "PROGRAMADA" && esHoy && (
                      <Button
                        size="xs"
                        onClick={() =>
                          accion(
                            c,
                            "llegada",
                            "",
                            undefined,
                            `Llegada de ${c.paciente.nombreCompleto} registrada.`
                          )
                        }
                      >
                        Llegó
                      </Button>
                    )}
                    {c.estado === "PROGRAMADA" && (
                      <>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setFormulario({ tipo: "reprogramar", cita: c })
                          }
                        >
                          Reprogramar
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => cancelar(c)}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {((c.estado === "PROGRAMADA" && fecha <= hoyISO()) ||
                      c.estado === "EN_ESPERA_TRIAJE") && (
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() =>
                          accion(
                            c,
                            "no-se-presento",
                            `¿Marcar que ${c.paciente.nombreCompleto} no se presentó?`
                          )
                        }
                      >
                        No se presentó
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {citas?.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay citas para esta fecha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
