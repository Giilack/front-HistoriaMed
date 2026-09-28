import * as React from "react"
import {
  Activity,
  CheckCheck,
  Clock,
  Eye,
  HeartPulse,
  Play,
  RefreshCw,
  Stethoscope,
  UserRoundX,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useConfirmacion } from "@/components/Confirmacion"
import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { Alerta, Select } from "@/components/form"
import { EncabezadoPagina, EstadoVacio } from "@/components/pagina"
import { PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import {
  formatearFecha,
  formatearHora,
  hoyISO,
  minutosDesde,
} from "@/lib/fechas"
import {
  NIVEL_PRIORIDAD,
  NOMBRE_PRIORIDAD,
  type Atencion,
  type Cita,
  type Consultorio,
  type Prioridad,
  type Triaje,
} from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"
import { cn } from "@/lib/utils"
import { AtencionPage } from "@/pages/atencion/AtencionPage"
import { FormularioTriaje } from "@/pages/triaje/FormularioTriaje"
import { TriajeResumen } from "@/pages/triaje/TriajeResumen"

/** Minutos de espera a partir de los cuales se resalta en rojo. */
const ESPERA_LARGA = 30

/** Borde izquierdo de la tarjeta según la prioridad asignada en triaje. */
const BORDE_PRIORIDAD: Record<Prioridad, string> = {
  URGENTE: "border-l-destructive",
  PREFERENTE: "border-l-amber-500",
  NORMAL: "border-l-marca",
}

const porLlegada = (a: Cita, b: Cita) =>
  (a.llegadaEn ?? "").localeCompare(b.llegadaEn ?? "")

/**
 * Cola del día.
 * - triaje: pacientes que llegaron y esperan triaje, por orden de llegada; desde aquí se registra el triaje.
 * - medico: sus pacientes de hoy (el backend solo le devuelve los suyos); los que esperan consulta se ordenan
 *   por prioridad y luego por hora de llegada (plan.md, sección 5.3). Desde aquí el médico atiende.
 */
export function ColaPage({ modo }: { modo: "triaje" | "medico" }) {
  const [consultorioId, setConsultorioId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [triando, setTriando] = React.useState<Cita | null>(null)
  const [atencion, setAtencion] = React.useState<Atencion | null>(null)
  const [viendoTriaje, setViendoTriaje] = React.useState<Cita | null>(null)
  const { datos: consultorios } = useApi<Consultorio[]>("/api/consultorios")
  const { confirmar } = useConfirmacion()

  const params = new URLSearchParams({ fecha: hoyISO() })
  if (modo === "triaje") params.set("estado", "EN_ESPERA_TRIAJE")
  if (consultorioId) params.set("consultorioId", consultorioId)
  const {
    datos: citas,
    error: errorCarga,
    recargar,
  } = useApi<Cita[]>(`/api/citas?${params}`)
  const ahora = useReloj(30_000, recargar)

  async function noRespondio(c: Cita) {
    if (
      !(await confirmar({
        titulo: `¿${c.paciente.nombreCompleto} no respondió al llamado?`,
        descripcion:
          "Saldrá de la cola y la cita quedará como «no se presentó».",
        accion: "Sí, no respondió",
        destructivo: true,
      }))
    )
      return
    setError(null)
    try {
      await api(`/api/citas/${c.id}/no-se-presento`, { method: "PATCH" })
      toast.success(`${c.paciente.nombreCompleto} salió de la cola`)
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
          toast.success(
            `Triaje de ${triando.paciente.nombreCompleto} registrado`,
            {
              description: `Prioridad ${NOMBRE_PRIORIDAD[t.prioridad].toLowerCase()} · pasó a la cola de ${triando.medico.nombreCompleto}`,
            }
          )
          recargar()
        }}
      />
    )
  }

  const lista = citas ?? []
  const esperando =
    modo === "triaje"
      ? lista.length
      : lista.filter((c) => c.estado === "EN_ESPERA_CONSULTA").length

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={modo === "triaje" ? "Cola de triaje" : "Mis pacientes de hoy"}
        descripcion={
          <span className="capitalize">
            {formatearFecha(hoyISO())}
            {citas &&
              ` · ${esperando} en espera · se actualiza cada 30 segundos`}
          </span>
        }
        acciones={
          <>
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
            <Button
              variant="outline"
              size="icon"
              aria-label="Actualizar"
              onClick={recargar}
            >
              <RefreshCw />
            </Button>
          </>
        }
      />

      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}

      {!citas ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : modo === "triaje" ? (
        lista.length === 0 ? (
          <Card>
            <EstadoVacio
              icono={HeartPulse}
              titulo="No hay pacientes esperando triaje"
              descripcion="Cuando admisión registre una llegada, el paciente aparecerá aquí."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...lista].sort(porLlegada).map((c) => (
              <TarjetaTurno
                key={c.id}
                cita={c}
                ahora={ahora}
                desde={c.llegadaEn}
                mostrarMedico
              >
                <Button className="flex-1" onClick={() => setTriando(c)}>
                  <Activity />
                  Registrar triaje
                </Button>
                <Button variant="outline" onClick={() => noRespondio(c)}>
                  <UserRoundX />
                  No respondió
                </Button>
              </TarjetaTurno>
            ))}
          </div>
        )
      ) : (
        <ColaMedico
          citas={lista}
          ahora={ahora}
          alAtender={abrirAtencion}
          alVerTriaje={setViendoTriaje}
        />
      )}

      <Dialog
        open={!!viendoTriaje}
        onOpenChange={(abierto) => !abierto && setViendoTriaje(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Triaje · {viendoTriaje?.paciente.nombreCompleto}
            </DialogTitle>
            <DialogDescription>
              {viendoTriaje?.paciente.edad} · {viendoTriaje?.paciente.numeroHc}
            </DialogDescription>
          </DialogHeader>
          {viendoTriaje && <TriajeDeCita citaId={viendoTriaje.id} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ColaMedico({
  citas,
  ahora,
  alAtender,
  alVerTriaje,
}: {
  citas: Cita[]
  ahora: number
  alAtender: (c: Cita) => void
  alVerTriaje: (c: Cita) => void
}) {
  const enConsulta = citas.filter((c) => c.estado === "EN_CONSULTA")
  const esperando = citas
    .filter((c) => c.estado === "EN_ESPERA_CONSULTA")
    .sort(
      (a, b) =>
        (b.prioridad ? NIVEL_PRIORIDAD[b.prioridad] : -1) -
          (a.prioridad ? NIVEL_PRIORIDAD[a.prioridad] : -1) || porLlegada(a, b)
    )
  const masTarde = citas
    .filter((c) => c.estado === "EN_ESPERA_TRIAJE" || c.estado === "PROGRAMADA")
    .sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99"))
  const finalizados = citas.filter((c) =>
    ["ATENDIDO", "NO_SE_PRESENTO", "CANCELADA"].includes(c.estado)
  )

  if (citas.length === 0) {
    return (
      <Card>
        <EstadoVacio icono={Stethoscope} titulo="No tiene pacientes para hoy" />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {enConsulta.length > 0 && (
        <Seccion
          icono={Stethoscope}
          titulo="En consulta"
          cantidad={enConsulta.length}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enConsulta.map((c) => (
              <TarjetaTurno
                key={c.id}
                cita={c}
                ahora={ahora}
                desde={c.consultaInicioEn}
                etiquetaEspera="en consulta"
              >
                <Button className="flex-1" onClick={() => alAtender(c)}>
                  <Play />
                  Continuar atención
                </Button>
              </TarjetaTurno>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion
        icono={Clock}
        titulo="Esperando consulta"
        cantidad={esperando.length}
      >
        {esperando.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nadie espera consulta en este momento.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {esperando.map((c) => (
              <TarjetaTurno
                key={c.id}
                cita={c}
                ahora={ahora}
                desde={c.triajeEn}
                etiquetaEspera="desde el triaje"
              >
                <Button className="flex-1" onClick={() => alAtender(c)}>
                  <Stethoscope />
                  Atender
                </Button>
                <Button variant="outline" onClick={() => alVerTriaje(c)}>
                  <Eye />
                  Triaje
                </Button>
              </TarjetaTurno>
            ))}
          </div>
        )}
      </Seccion>

      {masTarde.length > 0 && (
        <Seccion
          icono={HeartPulse}
          titulo="Más tarde"
          cantidad={masTarde.length}
          descripcion="En triaje o por llegar"
        >
          <ListaCompacta citas={masTarde} />
        </Seccion>
      )}

      {finalizados.length > 0 && (
        <Seccion
          icono={CheckCheck}
          titulo="Finalizados"
          cantidad={finalizados.length}
        >
          <ListaCompacta
            citas={finalizados}
            alAbrir={(c) => c.estado === "ATENDIDO" && alAtender(c)}
          />
        </Seccion>
      )}
    </div>
  )
}

function Seccion({
  icono: Icono,
  titulo,
  cantidad,
  descripcion,
  children,
}: {
  icono: LucideIcon
  titulo: string
  cantidad: number
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icono className="size-4 text-marca" aria-hidden />
        <h2 className="font-semibold">{titulo}</h2>
        <span className="rounded-full bg-marca-claro px-2 py-0.5 text-xs font-semibold text-marca-oscuro dark:bg-muted dark:text-foreground">
          {cantidad}
        </span>
        {descripcion && (
          <span className="text-sm text-muted-foreground">· {descripcion}</span>
        )}
      </div>
      {children}
    </section>
  )
}

/** Tarjeta de un paciente en la cola: turno, datos, prioridad y tiempo de espera. */
function TarjetaTurno({
  cita: c,
  ahora,
  desde,
  etiquetaEspera = "de espera",
  mostrarMedico = false,
  children,
}: {
  cita: Cita
  ahora: number
  /** Instante desde el que se cuenta la espera. */
  desde: string | null
  etiquetaEspera?: string
  mostrarMedico?: boolean
  children: React.ReactNode
}) {
  const minutos = desde ? minutosDesde(desde, ahora) : null
  const larga = minutos !== null && minutos >= ESPERA_LARGA
  return (
    <Card
      className={cn(
        "gap-4 border-l-4 py-4",
        c.prioridad ? BORDE_PRIORIDAD[c.prioridad] : "border-l-marca"
      )}
    >
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-marca-claro text-marca-oscuro dark:bg-muted dark:text-foreground">
            <span className="text-[10px] leading-none font-medium uppercase">
              Turno
            </span>
            <span className="text-lg leading-tight font-bold">
              {c.numeroTurno ?? "—"}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {c.paciente.nombreCompleto}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {c.paciente.edad} · {c.paciente.sexo === "FEMENINO" ? "F" : "M"} ·{" "}
              <span className="font-mono">{c.paciente.numeroHc}</span>
            </p>
          </div>
          {c.prioridad && <PrioridadEtiqueta prioridad={c.prioridad} />}
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {c.consultorio.nombre}
            {mostrarMedico && ` · ${c.medico.nombreCompleto}`}
          </span>
          {c.motivo && <span className="truncate">{c.motivo}</span>}
          {minutos !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                larga
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Clock className="size-3.5" aria-hidden />
              {minutos} min {etiquetaEspera}
            </span>
          )}
        </div>

        <div className="flex gap-2">{children}</div>
      </CardContent>
    </Card>
  )
}

/** Lista breve para pacientes que no requieren acción inmediata. */
function ListaCompacta({
  citas,
  alAbrir,
}: {
  citas: Cita[]
  alAbrir?: (c: Cita) => void
}) {
  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y">
        {citas.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
          >
            <span className="w-14 shrink-0 font-medium tabular-nums">
              {c.sinCita ? (
                <span className="text-xs text-muted-foreground">Sin cita</span>
              ) : (
                formatearHora(c.hora)
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <b className="font-medium">{c.paciente.nombreCompleto}</b>
              <span className="text-muted-foreground">
                {" "}
                · {c.paciente.edad}
              </span>
            </span>
            <EstadoCitaEtiqueta estado={c.estado} />
            {alAbrir && c.estado === "ATENDIDO" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-marca"
                onClick={() => alAbrir(c)}
              >
                Ver atención
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function TriajeDeCita({ citaId }: { citaId: number }) {
  const { datos, error } = useApi<Triaje>(`/api/citas/${citaId}/triaje`)
  if (error) return <Alerta>{error}</Alerta>
  if (!datos) return <Skeleton className="h-40 w-full" />
  return <TriajeResumen triaje={datos} />
}
