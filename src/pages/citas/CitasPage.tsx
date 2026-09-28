import * as React from "react"
import {
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  EllipsisVertical,
  LogIn,
  RefreshCw,
  UserRoundX,
} from "lucide-react"
import { toast } from "sonner"

import { useConfirmacion } from "@/components/Confirmacion"
import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta, Input, Select } from "@/components/form"
import {
  AvatarIniciales,
  EncabezadoPagina,
  EstadoVacio,
} from "@/components/pagina"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, json } from "@/lib/api"
import {
  fechaLocal,
  formatearFecha,
  formatearHora,
  horaDe,
  hoyISO,
} from "@/lib/fechas"
import {
  NOMBRE_ESTADO_CITA,
  type Cita,
  type Consultorio,
  type EstadoCita,
  type Medico,
} from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"

import { FormularioCita, type ModoCita } from "./FormularioCita"

/** Fecha ISO desplazada `dias` días. */
function sumarDias(iso: string, dias: number) {
  const d = fechaLocal(iso)
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Estados que se resumen arriba de la agenda, en el orden del flujo. */
const RESUMEN: EstadoCita[] = [
  "PROGRAMADA",
  "EN_ESPERA_TRIAJE",
  "EN_ESPERA_CONSULTA",
  "ATENDIDO",
  "NO_SE_PRESENTO",
]

/**
 * Agenda de ADMISION: programar citas, registrar llegadas (con o sin cita), reprogramar y cancelar.
 * Reglas en plan.md, sección 4.
 */
export function CitasPage() {
  const { confirmar, pedirTexto } = useConfirmacion()
  const [fecha, setFecha] = React.useState(hoyISO())
  const [consultorioId, setConsultorioId] = React.useState("")
  const [medicoId, setMedicoId] = React.useState("")
  const [formulario, setFormulario] = React.useState<ModoCita | null>(null)
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
    confirmacion: Parameters<typeof confirmar>[0] | null,
    cuerpo?: object,
    exito?: string
  ) {
    if (confirmacion && !(await confirmar(confirmacion))) return
    setErrorAccion(null)
    try {
      await api(`/api/citas/${c.id}/${ruta}`, {
        method: "PATCH",
        ...(cuerpo && json(cuerpo)),
      })
      if (exito) toast.success(exito)
      recargar()
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  async function cancelar(c: Cita) {
    const motivo = await pedirTexto({
      titulo: `¿Cancelar la cita de ${c.paciente.nombreCompleto}?`,
      etiqueta: "Motivo de la cancelación",
      placeholder: "ej. el paciente reprogramará",
      accion: "Cancelar cita",
      destructivo: true,
    })
    if (motivo === null) return
    void accion(c, "cancelar", null, { motivo }, "Cita cancelada")
  }

  function noSePresento(c: Cita) {
    void accion(
      c,
      "no-se-presento",
      {
        titulo: `¿${c.paciente.nombreCompleto} no se presentó?`,
        descripcion: "La cita quedará como «no se presentó».",
        accion: "Sí, marcar",
        destructivo: true,
      },
      undefined,
      "Cita marcada como no presentada"
    )
  }

  const error = errorAccion ?? errorCarga

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Citas"
        descripcion="Agenda del establecimiento: programación, llegadas y cancelaciones."
        acciones={
          <>
            <Button
              variant="outline"
              onClick={() => setFormulario({ tipo: "sinCita" })}
            >
              <DoorOpen />
              Llegada sin cita
            </Button>
            <Button onClick={() => setFormulario({ tipo: "nueva" })}>
              <CalendarPlus />
              Programar cita
            </Button>
          </>
        }
      />

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
            if (c.numeroTurno) {
              toast.success(
                `${c.paciente.nombreCompleto} pasó a la cola de triaje`,
                {
                  description: `Turno ${c.numeroTurno} · ${c.consultorio.nombre}`,
                }
              )
            } else {
              toast.success(`Cita de ${c.paciente.nombreCompleto} guardada`, {
                description: `${formatearFecha(c.fecha)} a las ${formatearHora(c.hora)}`,
              })
            }
            setFecha(c.fecha)
            recargar()
          }}
        />
      )}

      {error && <Alerta>{error}</Alerta>}

      <Card className="gap-0 py-0">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Día anterior"
              onClick={() => setFecha(sumarDias(fecha, -1))}
            >
              <ChevronLeft />
            </Button>
            <Input
              type="date"
              className="w-40"
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              aria-label="Fecha de la agenda"
            />
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Día siguiente"
              onClick={() => setFecha(sumarDias(fecha, 1))}
            >
              <ChevronRight />
            </Button>
            <Button
              size="sm"
              variant={esHoy ? "secondary" : "ghost"}
              onClick={() => setFecha(hoyISO())}
            >
              Hoy
            </Button>
          </div>
          <Select
            className="w-full sm:w-60"
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
            className="w-full sm:w-60"
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
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto"
            aria-label="Actualizar"
            onClick={recargar}
          >
            <RefreshCw />
          </Button>
        </div>

        {/* Resumen del día */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium capitalize">
            {formatearFecha(fecha)}
          </span>
          {citas &&
            RESUMEN.map((estado) => {
              const n = citas.filter((c) => c.estado === estado).length
              return (
                <span key={estado} className="text-muted-foreground">
                  <b className="text-foreground">{n}</b>{" "}
                  {NOMBRE_ESTADO_CITA[estado].toLowerCase()}
                </span>
              )
            })}
        </div>

        {citas?.length === 0 ? (
          <EstadoVacio
            icono={CalendarX2}
            titulo="No hay citas para esta fecha"
            descripcion={
              consultorioId || medicoId
                ? "Pruebe quitando los filtros."
                : undefined
            }
          >
            <Button
              variant="outline"
              onClick={() => setFormulario({ tipo: "nueva" })}
            >
              <CalendarPlus />
              Programar cita
            </Button>
          </EstadoVacio>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-24 pl-4">Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Médico · Consultorio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32 pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!citas
                ? [0, 1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : citas.map((c) => {
                    const puedeLlegar = c.estado === "PROGRAMADA" && esHoy
                    const programada = c.estado === "PROGRAMADA"
                    const puedeAusente =
                      (programada && fecha <= hoyISO()) ||
                      c.estado === "EN_ESPERA_TRIAJE"
                    const hayMenu = programada || puedeAusente
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="pl-4 align-top">
                          {c.sinCita ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              Sin cita
                            </span>
                          ) : (
                            <span className="text-base font-semibold tabular-nums">
                              {formatearHora(c.hora)}
                            </span>
                          )}
                          {c.numeroTurno && (
                            <span className="block text-xs text-muted-foreground">
                              Turno {c.numeroTurno}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarIniciales
                              nombre={c.paciente.nombreCompleto}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {c.paciente.nombreCompleto}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                <span className="font-mono">
                                  {c.paciente.numeroHc}
                                </span>{" "}
                                · {c.paciente.edad}
                                {c.motivo && ` · ${c.motivo}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{c.medico.nombreCompleto}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.consultorio.nombre}
                          </div>
                        </TableCell>
                        <TableCell>
                          <EstadoCitaEtiqueta estado={c.estado} />
                          {c.llegadaEn && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Llegó {horaDe(c.llegadaEn)}
                            </div>
                          )}
                          {c.motivoCancelacion && (
                            <div
                              className="mt-1 max-w-48 truncate text-xs text-muted-foreground"
                              title={c.motivoCancelacion}
                            >
                              {c.motivoCancelacion}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {puedeLlegar && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  accion(
                                    c,
                                    "llegada",
                                    null,
                                    undefined,
                                    `Llegada de ${c.paciente.nombreCompleto} registrada`
                                  )
                                }
                              >
                                <LogIn />
                                Llegó
                              </Button>
                            )}
                            {hayMenu && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label="Más acciones"
                                    />
                                  }
                                >
                                  <EllipsisVertical />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-44"
                                >
                                  {programada && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setFormulario({
                                          tipo: "reprogramar",
                                          cita: c,
                                        })
                                      }
                                    >
                                      <CalendarPlus />
                                      Reprogramar
                                    </DropdownMenuItem>
                                  )}
                                  {programada && (
                                    <DropdownMenuItem
                                      onClick={() => cancelar(c)}
                                    >
                                      <CalendarX2 />
                                      Cancelar cita
                                    </DropdownMenuItem>
                                  )}
                                  {puedeAusente && (
                                    <>
                                      {programada && <DropdownMenuSeparator />}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => noSePresento(c)}
                                      >
                                        <UserRoundX />
                                        No se presentó
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
