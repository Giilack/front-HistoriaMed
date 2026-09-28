import * as React from "react"

import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta, Select } from "@/components/form"
import { PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
  formatearFecha,
  formatearHora,
  horaDe,
  hoyISO,
  minutosDesde,
} from "@/lib/fechas"
import {
  NIVEL_PRIORIDAD,
  NOMBRE_PRIORIDAD,
  type Cita,
  type Consultorio,
  type EstadoCita,
  type Atencion,
  type Triaje,
} from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"
import { AtencionPage } from "@/pages/atencion/AtencionPage"
import { FormularioTriaje } from "@/pages/triaje/FormularioTriaje"
import { TriajeResumen } from "@/pages/triaje/TriajeResumen"

/** Ambas vistas tienen 6 columnas. */
const COLUMNAS = 6

/** Orden de la lista del médico: primero quien está en consulta, luego quienes esperan, luego el resto. */
const ORDEN_ESTADO: Record<EstadoCita, number> = {
  EN_CONSULTA: 0,
  EN_ESPERA_CONSULTA: 1,
  EN_ESPERA_TRIAJE: 2,
  PROGRAMADA: 3,
  ATENDIDO: 4,
  NO_SE_PRESENTO: 5,
  CANCELADA: 6,
}

/**
 * Cola del día.
 * - triaje: pacientes que llegaron y esperan triaje, por orden de llegada; desde aquí se registra el triaje.
 * - medico: sus pacientes de hoy (el backend solo le devuelve los suyos); los que esperan consulta se ordenan
 *   por prioridad y luego por hora de llegada (plan.md, sección 5.3). La consulta se agregará en la fase 5.
 */
export function ColaPage({ modo }: { modo: "triaje" | "medico" }) {
  const [consultorioId, setConsultorioId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [mensaje, setMensaje] = React.useState<string | null>(null)
  const [triando, setTriando] = React.useState<Cita | null>(null)
  const [atencion, setAtencion] = React.useState<Atencion | null>(null)
  const [expandida, setExpandida] = React.useState<number | null>(null)
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

  const ordenadas = React.useMemo(() => {
    const porLlegada = (a: Cita, b: Cita) =>
      (a.llegadaEn ?? "").localeCompare(b.llegadaEn ?? "")
    const lista = [...(citas ?? [])]
    if (modo === "triaje") return lista.sort(porLlegada)
    return lista.sort(
      (a, b) =>
        ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
        (b.prioridad ? NIVEL_PRIORIDAD[b.prioridad] : -1) -
          (a.prioridad ? NIVEL_PRIORIDAD[a.prioridad] : -1) ||
        porLlegada(a, b)
    )
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

  /** Atender (abre o retoma la atención) o ver una atención ya terminada. */
  async function abrirAtencion(c: Cita) {
    setError(null)
    setMensaje(null)
    try {
      const terminada = c.estado === "ATENDIDO"
      setAtencion(
        await api<Atencion>(`/api/citas/${c.id}/atencion`, {
          method: terminada ? "GET" : "POST",
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la atención")
    }
  }

  if (atencion) {
    return (
      <AtencionPage
        key={atencion.id}
        atencion={atencion}
        alVolver={() => {
          setAtencion(null)
          recargar()
        }}
      />
    )
  }

  if (triando) {
    return (
      <FormularioTriaje
        cita={triando}
        alCancelar={() => setTriando(null)}
        alGuardar={(t) => {
          setTriando(null)
          setError(null)
          setMensaje(
            `Triaje de ${triando.paciente.nombreCompleto} registrado con prioridad ${NOMBRE_PRIORIDAD[t.prioridad].toLowerCase()}. ` +
              `Pasó a la cola de ${triando.medico.nombreCompleto}.`
          )
          recargar()
        }}
      />
    )
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

      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Turno</th>
              <th className="px-3 py-2 font-medium">Paciente</th>
              <th className="px-3 py-2 font-medium">Consultorio</th>
              {modo === "triaje" ? (
                <>
                  <th className="px-3 py-2 font-medium">Médico</th>
                  <th className="px-3 py-2 font-medium">Espera</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 font-medium">Prioridad</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </>
              )}
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((c) => {
              const espera = c.llegadaEn
                ? minutosDesde(c.llegadaEn, ahora)
                : null
              return (
                <React.Fragment key={c.id}>
                  <tr className="border-t">
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
                    {modo === "triaje" ? (
                      <>
                        <td className="px-3 py-2">{c.medico.nombreCompleto}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
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
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">
                          {c.prioridad ? (
                            <PrioridadEtiqueta prioridad={c.prioridad} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <EstadoCitaEtiqueta estado={c.estado} />
                          <div className="text-xs text-muted-foreground">
                            {c.sinCita
                              ? "Sin cita"
                              : `Cita ${formatearHora(c.hora)}`}
                            {c.estado === "EN_ESPERA_CONSULTA" &&
                              c.triajeEn &&
                              ` · espera ${minutosDesde(c.triajeEn, ahora)} min`}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {modo === "triaje" && (
                          <>
                            <Button size="xs" onClick={() => setTriando(c)}>
                              Registrar triaje
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => noRespondio(c)}
                            >
                              No respondió
                            </Button>
                          </>
                        )}
                        {modo === "medico" &&
                          c.estado === "EN_ESPERA_CONSULTA" && (
                            <Button size="xs" onClick={() => abrirAtencion(c)}>
                              Atender
                            </Button>
                          )}
                        {modo === "medico" && c.estado === "EN_CONSULTA" && (
                          <Button size="xs" onClick={() => abrirAtencion(c)}>
                            Continuar
                          </Button>
                        )}
                        {modo === "medico" && c.estado === "ATENDIDO" && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => abrirAtencion(c)}
                          >
                            Ver atención
                          </Button>
                        )}
                        {modo === "medico" && c.triajeEn && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              setExpandida(expandida === c.id ? null : c.id)
                            }
                          >
                            {expandida === c.id
                              ? "Ocultar triaje"
                              : "Ver triaje"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandida === c.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={COLUMNAS} className="px-3 py-3">
                        <TriajeDeCita citaId={c.id} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {citas?.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNAS}
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

function TriajeDeCita({ citaId }: { citaId: number }) {
  const { datos, error } = useApi<Triaje>(`/api/citas/${citaId}/triaje`)
  if (error) return <Alerta>{error}</Alerta>
  if (!datos) return <p className="text-muted-foreground">Cargando…</p>
  return <TriajeResumen triaje={datos} />
}
