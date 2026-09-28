import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardList,
  FileText,
  HeartPulse,
  IdCard,
  Pencil,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthContext"
import { useConfirmacion } from "@/components/Confirmacion"
import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta } from "@/components/form"
import {
  AvatarIniciales,
  EncabezadoPagina,
  EstadoVacio,
} from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { cn } from "@/lib/utils"
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

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" })
const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

export function FichaPaciente({
  id,
  alVolver,
}: {
  id: number
  alVolver: () => void
}) {
  const { usuario } = useAuth()
  const puedeEditar = usuario?.rol === "ADMISION"
  const { confirmar } = useConfirmacion()
  // Datos clínicos (alergias, triajes): solo TRIAJE y MEDICO (plan.md, principio P1)
  const veDatosClinicos = usuario?.rol === "TRIAJE" || usuario?.rol === "MEDICO"
  const esMedico = usuario?.rol === "MEDICO"
  const {
    datos: paciente,
    error: errorCarga,
    setDatos,
  } = useApi<Paciente>(`/api/pacientes/${id}`)
  const [modo, setModo] = React.useState<"ver" | "editar" | "financiamiento">(
    "ver"
  )
  const [error, setError] = React.useState<string | null>(null)

  function actualizado(p: Paciente, texto: string) {
    setDatos(p)
    setModo("ver")
    setError(null)
    toast.success(texto)
  }

  async function verificar(estado: EstadoSeguro) {
    if (!paciente) return
    const tipo = NOMBRE_FINANCIAMIENTO[paciente.financiamiento.tipo]
    if (
      !(await confirmar({
        titulo: `¿El ${tipo} del paciente está ${NOMBRE_ESTADO_SEGURO[estado].toLowerCase()}?`,
        descripcion:
          "Confirme que lo verificó en el padrón del seguro. Quedará registrada la fecha de verificación.",
        accion: "Registrar verificación",
      }))
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
        "Verificación del seguro registrada"
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar la verificación"
      )
    }
  }

  if (errorCarga) return <Alerta>{errorCarga}</Alerta>
  if (!paciente) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const f = paciente.financiamiento
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Ficha del paciente"
        alVolver={alVolver}
        textoVolver="Volver a pacientes"
      />

      {/* Cabecera con los datos que identifican al paciente */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <AvatarIniciales
            nombre={paciente.nombreCompleto}
            className="size-14 text-lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {paciente.nombreCompleto}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-mono">
                {paciente.numeroHc}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <IdCard className="size-4" aria-hidden />
                {paciente.numeroDocumento
                  ? `${NOMBRE_TIPO_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento}`
                  : "Sin documento"}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-4" aria-hidden />
                {paciente.edad} ·{" "}
                {paciente.sexo === "FEMENINO" ? "Femenino" : "Masculino"}
              </span>
              <Badge variant="secondary">{NOMBRE_FINANCIAMIENTO[f.tipo]}</Badge>
              {f.estado && <EstadoSeguroEtiqueta estado={f.estado} />}
            </div>
          </div>
          {puedeEditar && modo === "ver" && (
            <Button variant="outline" onClick={() => setModo("editar")}>
              <Pencil />
              Editar datos
            </Button>
          )}
        </CardContent>
      </Card>

      {error && <Alerta>{error}</Alerta>}

      {modo === "editar" && (
        <FormularioPaciente
          paciente={paciente}
          alGuardar={(p) => actualizado(p, "Datos del paciente actualizados")}
          alCancelar={() => setModo("ver")}
        />
      )}
      {modo === "financiamiento" && (
        <FormularioFinanciamiento
          paciente={paciente}
          alGuardar={(p) => actualizado(p, "Financiamiento actualizado")}
          alCancelar={() => setModo("ver")}
        />
      )}

      {modo === "ver" && (
        <Tabs defaultValue="datos">
          <TabsList
            variant="line"
            className="w-full justify-start gap-2 overflow-x-auto border-b pb-0"
          >
            <Pestana valor="datos" icono={UserRound} texto="Datos" />
            {veDatosClinicos && (
              <Pestana
                valor="clinico"
                icono={HeartPulse}
                texto="Alergias y triajes"
              />
            )}
            {esMedico && (
              <Pestana
                valor="historia"
                icono={Stethoscope}
                texto="Historia clínica"
              />
            )}
            <Pestana valor="documentos" icono={FileText} texto="Documentos" />
            <Pestana valor="citas" icono={CalendarDays} texto="Citas" />
          </TabsList>

          <TabsContent value="datos" className="pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Filiación</CardTitle>
                  <CardDescription>
                    Datos personales y de contacto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Datos
                    filas={[
                      [
                        "Fecha de nacimiento",
                        formatoFecha.format(
                          fechaLocal(paciente.fechaNacimiento)
                        ),
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
                  <CardDescription>
                    Seguro con el que se atiende
                  </CardDescription>
                  {puedeEditar && (
                    <CardAction>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModo("financiamiento")}
                      >
                        <Pencil />
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
                            [
                              f.tipo === "PRIVADO" ? "Aseguradora" : "Plan",
                              f.plan,
                            ],
                            [
                              "Estado",
                              f.estado && (
                                <EstadoSeguroEtiqueta estado={f.estado} />
                              ),
                            ],
                            [
                              "Verificado",
                              f.verificadoEn &&
                                formatoFechaHora.format(
                                  new Date(f.verificadoEn)
                                ),
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
                    <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <ShieldCheck
                          className="size-4 text-marca"
                          aria-hidden
                        />
                        Resultado de la verificación en el padrón
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verificar("ACTIVO")}
                        >
                          <CircleCheck className="text-green-600" />
                          Activo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verificar("INACTIVO")}
                        >
                          <CircleX className="text-destructive" />
                          Inactivo
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {veDatosClinicos && (
            <TabsContent value="clinico" className="pt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Alergias</CardTitle>
                    <CardDescription>
                      Se verifican automáticamente al recetar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PanelAlergias pacienteId={paciente.id} />
                  </CardContent>
                </Card>
                <HistorialTriajes pacienteId={paciente.id} />
              </div>
            </TabsContent>
          )}

          {esMedico && (
            <TabsContent value="historia" className="pt-4">
              <HistoriaClinica pacienteId={paciente.id} />
            </TabsContent>
          )}

          <TabsContent value="documentos" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos clínicos</CardTitle>
                <CardDescription>
                  Análisis, informes, imágenes y referencias (PDF, JPG o PNG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PanelDocumentos pacienteId={paciente.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="citas" className="pt-4">
            <CitasDelPaciente pacienteId={paciente.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function Pestana({
  valor,
  icono: Icono,
  texto,
}: {
  valor: string
  icono: React.ComponentType<{ className?: string }>
  texto: string
}) {
  return (
    <TabsTrigger
      value={valor}
      className="flex-none px-3 pb-2.5 after:bg-marca data-active:text-marca dark:data-active:text-marca"
    >
      <Icono className="size-4" />
      {texto}
    </TabsTrigger>
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
        <CardDescription>
          Signos vitales de las últimas atenciones
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!triajes ? (
          <Skeleton className="h-24 w-full" />
        ) : triajes.length === 0 ? (
          <EstadoVacio
            icono={HeartPulse}
            titulo="Sin triajes registrados"
            className="py-6"
          />
        ) : (
          triajes.map((t, i) => (
            <details
              key={t.id}
              open={i === 0}
              className="group rounded-lg border bg-card p-3"
            >
              <summary className="cursor-pointer text-sm font-medium marker:text-muted-foreground">
                {formatoFechaHora.format(new Date(t.fechaHora))} ·{" "}
                {t.motivoConsulta}
              </summary>
              <div className="pt-3">
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
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Citas</CardTitle>
        <CardDescription>Programadas, atendidas y canceladas</CardDescription>
      </CardHeader>
      {!citas ? (
        <CardContent className="pb-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      ) : citas.length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo="El paciente no tiene citas registradas"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-6">Fecha</TableHead>
              <TableHead>Consultorio</TableHead>
              <TableHead>Médico</TableHead>
              <TableHead className="pr-6">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-6 whitespace-nowrap">
                  <span className="capitalize">{formatearFecha(c.fecha)}</span>
                  <span className="ml-1 text-muted-foreground">
                    {c.sinCita ? "(sin cita)" : formatearHora(c.hora)}
                  </span>
                </TableCell>
                <TableCell>{c.consultorio.nombre}</TableCell>
                <TableCell>{c.medico.nombreCompleto}</TableCell>
                <TableCell className="pr-6">
                  <EstadoCitaEtiqueta estado={c.estado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

/** Estado del seguro como etiqueta: verde activo, rojo inactivo, ámbar sin verificar. */
export function EstadoSeguroEtiqueta({ estado }: { estado: EstadoSeguro }) {
  const estilos: Record<EstadoSeguro, string> = {
    ACTIVO: "bg-green-600/10 text-green-700 dark:text-green-400",
    INACTIVO: "bg-destructive/10 text-destructive",
    NO_VERIFICADO: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  }
  const punto: Record<EstadoSeguro, string> = {
    ACTIVO: "bg-green-600",
    INACTIVO: "bg-destructive",
    NO_VERIFICADO: "bg-amber-500",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        estilos[estado]
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", punto[estado])}
        aria-hidden
      />
      {NOMBRE_ESTADO_SEGURO[estado]}
    </span>
  )
}

/** Lista de datos en dos columnas: etiqueta arriba, valor abajo. */
function Datos({ filas }: { filas: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {etiqueta}
          </dt>
          <dd className="text-sm break-words">
            {valor || <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
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
        <CardDescription>
          Si cambia el seguro, la verificación anterior deja de valer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-5"
          noValidate
        >
          {error && <Alerta>{error}</Alerta>}
          <CamposFinanciamiento
            tipo={tipo}
            registrar={(campo) => register(campo)}
            errores={errors}
          />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
