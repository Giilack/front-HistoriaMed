import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { useAuth } from "@/auth/AuthContext"
import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError, api, json } from "@/lib/api"
import { fechaLocal, formatearFecha, formatearHora } from "@/lib/fechas"
import {
  NOMBRE_ESTADO_SEGURO,
  NOMBRE_FINANCIAMIENTO,
  NOMBRE_TIPO_DOCUMENTO,
  type Cita,
  type EstadoSeguro,
  type Paciente,
  type Triaje,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { HistoriaClinica } from "@/pages/atencion/HistoriaClinica"
import { PanelDocumentos } from "@/pages/documentos/PanelDocumentos"
import { PanelAlergias } from "@/pages/triaje/PanelAlergias"
import { TriajeResumen } from "@/pages/triaje/TriajeResumen"

import { CamposFinanciamiento } from "./CamposFinanciamiento"
import {
  financiamientoAPayload,
  financiamientoDesdePaciente,
  financiamientoSchema,
  type FinanciamientoForm,
} from "./esquemas"
import { FormularioPaciente } from "./FormularioPaciente"

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" })
const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

export function FichaPaciente({
  id,
  mensajeInicial,
  alVolver,
}: {
  id: number
  mensajeInicial?: string
  alVolver: () => void
}) {
  const { usuario } = useAuth()
  const puedeEditar = usuario?.rol === "ADMISION"
  // Datos clínicos (alergias, triajes): solo TRIAJE y MEDICO (plan.md, principio P1)
  const veDatosClinicos = usuario?.rol === "TRIAJE" || usuario?.rol === "MEDICO"
  const {
    datos: paciente,
    error: errorCarga,
    setDatos,
  } = useApi<Paciente>(`/api/pacientes/${id}`)
  const [modo, setModo] = React.useState<"ver" | "editar" | "financiamiento">(
    "ver"
  )
  const [mensaje, setMensaje] = React.useState<string | undefined>(
    mensajeInicial
  )
  const [error, setError] = React.useState<string | null>(null)

  function actualizado(p: Paciente, texto: string) {
    setDatos(p)
    setModo("ver")
    setMensaje(texto)
    setError(null)
  }

  async function verificar(estado: EstadoSeguro) {
    if (!paciente) return
    const tipo = NOMBRE_FINANCIAMIENTO[paciente.financiamiento.tipo]
    if (
      !window.confirm(
        `¿Confirmar que el ${tipo} del paciente está ${NOMBRE_ESTADO_SEGURO[estado].toLowerCase()} en su padrón?`
      )
    )
      return
    try {
      actualizado(
        await api<Paciente>(
          `/api/pacientes/${id}/financiamiento/verificacion`,
          {
            method: "POST",
            ...json({ estado }),
          }
        ),
        "Verificación del seguro registrada."
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar la verificación"
      )
    }
  }

  if (errorCarga) return <Alerta>{errorCarga}</Alerta>
  if (!paciente) return <p className="text-muted-foreground">Cargando…</p>

  const f = paciente.financiamiento
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={alVolver}>
          ← Volver a la búsqueda
        </Button>
      </div>

      <div>
        <p className="font-mono text-sm text-muted-foreground">
          {paciente.numeroHc}
        </p>
        <h1 className="text-2xl font-semibold">{paciente.nombreCompleto}</h1>
        <p className="text-muted-foreground">
          {paciente.sexo === "FEMENINO" ? "Femenino" : "Masculino"} ·{" "}
          {paciente.edad} ·{" "}
          {paciente.numeroDocumento
            ? `${NOMBRE_TIPO_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento}`
            : "Sin documento"}
        </p>
      </div>

      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      {error && <Alerta>{error}</Alerta>}

      {modo === "editar" && (
        <FormularioPaciente
          paciente={paciente}
          alGuardar={(p) => actualizado(p, "Datos actualizados.")}
          alCancelar={() => setModo("ver")}
        />
      )}
      {modo === "financiamiento" && (
        <FormularioFinanciamiento
          paciente={paciente}
          alGuardar={(p) => actualizado(p, "Financiamiento actualizado.")}
          alCancelar={() => setModo("ver")}
        />
      )}

      {modo === "ver" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos del paciente</CardTitle>
              {puedeEditar && (
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModo("editar")}
                  >
                    Editar
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <Datos
                filas={[
                  [
                    "Fecha de nacimiento",
                    formatoFecha.format(fechaLocal(paciente.fechaNacimiento)),
                  ],
                  ["Teléfono", paciente.telefono],
                  ["Email", paciente.email],
                  ["Dirección", paciente.direccion],
                  [
                    "Contacto de emergencia",
                    paciente.contactoEmergenciaNombre &&
                      [
                        paciente.contactoEmergenciaNombre,
                        paciente.contactoEmergenciaParentesco &&
                          `(${paciente.contactoEmergenciaParentesco})`,
                        paciente.contactoEmergenciaTelefono,
                      ]
                        .filter(Boolean)
                        .join(" "),
                  ],
                  [
                    "Registrado",
                    formatoFechaHora.format(new Date(paciente.creadoEn)),
                  ],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financiamiento</CardTitle>
              {puedeEditar && (
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModo("financiamiento")}
                  >
                    Cambiar
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Datos
                filas={[
                  ["Tipo", NOMBRE_FINANCIAMIENTO[f.tipo]],
                  ...(f.tipo !== "PARTICULAR"
                    ? ([
                        ["N.º de afiliación", f.numeroAfiliacion],
                        [f.tipo === "PRIVADO" ? "Aseguradora" : "Plan", f.plan],
                        [
                          "Estado",
                          f.estado && (
                            <EstadoSeguroEtiqueta estado={f.estado} />
                          ),
                        ],
                        [
                          "Verificado",
                          f.verificadoEn &&
                            formatoFechaHora.format(new Date(f.verificadoEn)),
                        ],
                      ] as [string, React.ReactNode][])
                    : ([
                        [
                          "Orientado a afiliación SIS",
                          f.orientadoAfiliacionSis ? "Sí" : "No",
                        ],
                      ] as [string, React.ReactNode][])),
                ]}
              />
              {puedeEditar && f.tipo !== "PARTICULAR" && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    Resultado de la verificación en el padrón:
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => verificar("ACTIVO")}
                  >
                    Activo
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => verificar("INACTIVO")}
                  >
                    Inactivo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {modo === "ver" && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <PanelDocumentos pacienteId={paciente.id} />
          </CardContent>
        </Card>
      )}

      {modo === "ver" && veDatosClinicos && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alergias</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelAlergias pacienteId={paciente.id} />
            </CardContent>
          </Card>
          <HistorialTriajes pacienteId={paciente.id} />
        </div>
      )}

      {modo === "ver" && usuario?.rol === "MEDICO" && (
        <HistoriaClinica pacienteId={paciente.id} />
      )}

      {modo === "ver" && <CitasDelPaciente pacienteId={paciente.id} />}
    </div>
  )
}

/** Últimos triajes del paciente: el más reciente abierto, los anteriores plegados. */
function HistorialTriajes({ pacienteId }: { pacienteId: number }) {
  const { datos: triajes } = useApi<Triaje[]>(
    `/api/pacientes/${pacienteId}/triajes`
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Triajes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!triajes ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : triajes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            El paciente no tiene triajes registrados.
          </p>
        ) : (
          triajes.map((t, i) => (
            <details
              key={t.id}
              open={i === 0}
              className="rounded-md border p-2"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {formatoFechaHora.format(new Date(t.fechaHora))} ·{" "}
                {t.motivoConsulta}
              </summary>
              <div className="pt-2">
                <TriajeResumen triaje={t} />
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/** Historial de citas del paciente (más recientes primero). */
function CitasDelPaciente({ pacienteId }: { pacienteId: number }) {
  const { datos: citas } = useApi<Cita[]>(`/api/citas?pacienteId=${pacienteId}`)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Citas</CardTitle>
      </CardHeader>
      <CardContent>
        {!citas ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : citas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            El paciente no tiene citas registradas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {citas.map((c) => (
                <tr key={c.id} className="border-t first:border-t-0">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {formatearFecha(c.fecha)}{" "}
                    {c.sinCita ? "(sin cita)" : formatearHora(c.hora)}
                  </td>
                  <td className="py-2 pr-3">
                    {c.consultorio.nombre} · {c.medico.nombreCompleto}
                  </td>
                  <td className="py-2">
                    <EstadoCitaEtiqueta estado={c.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

export function EstadoSeguroEtiqueta({ estado }: { estado: EstadoSeguro }) {
  const estilos: Record<EstadoSeguro, string> = {
    ACTIVO: "text-green-700 dark:text-green-400",
    INACTIVO: "text-destructive",
    NO_VERIFICADO: "text-amber-600",
  }
  return (
    <span className={`font-medium ${estilos[estado]}`}>
      {NOMBRE_ESTADO_SEGURO[estado]}
    </span>
  )
}

function Datos({ filas }: { filas: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {filas.map(([etiqueta, valor]) => (
        <React.Fragment key={etiqueta}>
          <dt className="text-muted-foreground">{etiqueta}</dt>
          <dd>{valor || "—"}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

function FormularioFinanciamiento({
  paciente,
  alGuardar,
  alCancelar,
}: {
  paciente: Paciente
  alGuardar: (p: Paciente) => void
  alCancelar: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FinanciamientoForm>({
    resolver: zodResolver(financiamientoSchema),
    defaultValues: financiamientoDesdePaciente(paciente),
  })
  const tipo = useWatch({ control, name: "tipo" })
  const [error, setError] = React.useState<string | null>(null)

  async function enviar(datos: FinanciamientoForm) {
    setError(null)
    try {
      alGuardar(
        await api<Paciente>(`/api/pacientes/${paciente.id}/financiamiento`, {
          method: "PUT",
          ...json(financiamientoAPayload(datos)),
        })
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar financiamiento</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-4"
          noValidate
        >
          {error && <Alerta>{error}</Alerta>}
          <CamposFinanciamiento
            tipo={tipo}
            registrar={(campo) => register(campo)}
            errores={errors}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar"}
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
