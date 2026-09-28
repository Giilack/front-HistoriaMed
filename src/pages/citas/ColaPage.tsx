import * as React from "react"

import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
  formatearFecha,
  formatearHora,
  horaDe,
  hoyISO,
  minutosDesde,
} from "@/lib/fechas"
import type { Cita, Consultorio, EstadoCita } from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"

/**
 * Cola del día.
 * - triaje: pacientes que llegaron y esperan triaje, por orden de llegada.
 * - medico: sus pacientes de hoy (el backend solo le devuelve los suyos).
 * El registro del triaje (fase 4) y de la consulta (fase 5) se agregarán aquí.
 */
export function ColaPage({ modo }: { modo: "triaje" | "medico" }) {
  const [consultorioId, setConsultorioId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const { datos: consultorios } = useApi<Consultorio[]>("/api/consultorios")

  const params = new URLSearchParams({ fecha: hoyISO() })
  if (modo === "triaje") params.set("estado", "EN_ESPERA_TRIAJE")
  if (consultorioId) params.set("consultorioId", consultorioId)
  const {
    datos: citas,
    error: errorCarga,
    recargar,
  } = useApi<Cita[]>(`/api/citas?${params}`)
  const ahora = useReloj(30_000, recargar)

  // Triaje: por orden de llegada. Médico: primero quienes esperan consulta, luego el resto del día.
  const ordenadas = React.useMemo(() => {
    const lista = [...(citas ?? [])]
    if (modo === "triaje")
      return lista.sort((a, b) =>
        (a.llegadaEn ?? "").localeCompare(b.llegadaEn ?? "")
      )
    const prioridad: Record<EstadoCita, number> = {
      EN_CONSULTA: 0,
      EN_ESPERA_CONSULTA: 1,
      EN_ESPERA_TRIAJE: 2,
      PROGRAMADA: 3,
      ATENDIDO: 4,
      NO_SE_PRESENTO: 5,
      CANCELADA: 6,
    }
    return lista.sort((a, b) => prioridad[a.estado] - prioridad[b.estado])
  }, [citas, modo])

  async function noRespondio(c: Cita) {
    if (
      !window.confirm(
        `¿${c.paciente.nombreCompleto} no respondió al llamado? Saldrá de la cola.`
      )
    )
      return
    setError(null)
    try {
      await api(`/api/citas/${c.id}/no-se-presento`, { method: "PATCH" })
      recargar()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  const titulo = modo === "triaje" ? "Cola de triaje" : "Mis pacientes de hoy"
  const esperando =
    modo === "medico"
      ? citas?.filter((c) => c.estado === "EN_ESPERA_CONSULTA").length
      : citas?.length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          <p className="text-muted-foreground">
            {formatearFecha(hoyISO())}
            {esperando !== undefined && ` · ${esperando} en espera`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={recargar}>
            Actualizar
          </Button>
        </div>
      </div>

      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}
      {modo === "triaje" && (
        <Alerta tipo="info">
          El registro de signos vitales y prioridad se habilitará en la fase 4.
        </Alerta>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Turno</th>
              <th className="px-3 py-2 font-medium">Paciente</th>
              <th className="px-3 py-2 font-medium">Consultorio</th>
              {modo === "triaje" && (
                <th className="px-3 py-2 font-medium">Médico</th>
              )}
              <th className="px-3 py-2 font-medium">
                {modo === "triaje" ? "Espera" : "Hora"}
              </th>
              {modo === "medico" && (
                <th className="px-3 py-2 font-medium">Estado</th>
              )}
              {modo === "triaje" && (
                <th className="px-3 py-2 font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((c) => {
              const espera = c.llegadaEn
                ? minutosDesde(c.llegadaEn, ahora)
                : null
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 text-lg font-semibold">
                    {c.numeroTurno ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {c.paciente.nombreCompleto}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.paciente.numeroHc} · {c.paciente.edad} ·{" "}
                      {c.paciente.sexo === "FEMENINO" ? "F" : "M"}
                      {c.motivo && ` · ${c.motivo}`}
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.consultorio.nombre}</td>
                  {modo === "triaje" && (
                    <td className="px-3 py-2">{c.medico.nombreCompleto}</td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {modo === "triaje" ? (
                      <span
                        className={
                          espera !== null && espera >= 30
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {espera} min{" "}
                        <span className="text-xs text-muted-foreground">
                          (llegó {horaDe(c.llegadaEn)})
                        </span>
                      </span>
                    ) : c.sinCita ? (
                      <span className="text-muted-foreground">Sin cita</span>
                    ) : (
                      formatearHora(c.hora)
                    )}
                  </td>
                  {modo === "medico" && (
                    <td className="px-3 py-2">
                      <EstadoCitaEtiqueta estado={c.estado} />
                    </td>
                  )}
                  {modo === "triaje" && (
                    <td className="px-3 py-2">
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => noRespondio(c)}
                      >
                        No respondió
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
            {citas?.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {modo === "triaje"
                    ? "No hay pacientes esperando triaje."
                    : "No tiene pacientes para hoy."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
