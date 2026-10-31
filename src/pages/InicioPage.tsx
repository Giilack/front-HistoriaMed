import type * as React from "react"
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CircleAlert,
  Clock,
  HeartPulse,
  Stethoscope,
  UserRoundX,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { EstadoCitaEtiqueta } from "@/components/EstadoCitaEtiqueta"
import { PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fechaLocal, formatearHora, hoyISO, minutosDesde } from "@/lib/fechas"
import {
  NIVEL_PRIORIDAD,
  NOMBRE_ROL,
  type Cita,
  type Pagina,
  type Reporte,
  type Usuario,
} from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"

/** Panel de inicio según el rol: solo indicadores del día. A cada módulo se entra por el menú lateral. */
export function InicioPage() {
  const { usuario } = useAuth()
  if (!usuario) return null
  return (
    <div className="flex flex-col gap-6">
      <Saludo nombre={usuario.nombres} rol={NOMBRE_ROL[usuario.rol]} />
      {usuario.rol === "ADMISION" && <PanelAdmision />}
      {usuario.rol === "TRIAJE" && <PanelTriaje />}
      {usuario.rol === "MEDICO" && <PanelMedico />}
      {usuario.rol === "ADMIN" && <PanelAdmin />}
    </div>
  )
}

function Saludo({ nombre, rol }: { nombre: string; rol: string }) {
  const hora = new Date().getHours()
  const saludo =
    hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-marca-oscuro dark:text-foreground">
        {saludo}, {nombre.split(" ")[0]}
      </h1>
      <p className="text-muted-foreground">{rol} · Resumen de hoy</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------

function PanelAdmision() {
  const { datos: citas, recargar } = useApi<Cita[]>(
    `/api/citas?fecha=${hoyISO()}`
  )
  useReloj(60_000, recargar)
  const cuenta = (...estados: Cita["estado"][]) =>
    citas?.filter((c) => estados.includes(c.estado)).length
  const proximas = (citas ?? [])
    .filter((c) => c.estado === "PROGRAMADA")
    .sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
    .slice(0, 5)

  return (
    <>
      <FilaIndicadores>
        <Indicador
          icono={CalendarClock}
          titulo="Citas de hoy"
          valor={citas?.length}
        />
        <Indicador
          icono={CalendarCheck}
          titulo="Por llegar"
          valor={cuenta("PROGRAMADA")}
        />
        <Indicador
          icono={Activity}
          titulo="En el establecimiento"
          valor={cuenta(
            "EN_ESPERA_TRIAJE",
            "EN_ESPERA_CONSULTA",
            "EN_CONSULTA"
          )}
          detalle="en triaje o consulta"
        />
        <Indicador
          icono={UserRoundX}
          titulo="No se presentaron"
          valor={cuenta("NO_SE_PRESENTO")}
        />
      </FilaIndicadores>
      <ListaCitas
        titulo="Próximas citas"
        descripcion="Pacientes programados que aún no llegan"
        citas={citas ? proximas : undefined}
        vacio="No hay más citas programadas para hoy."
      />
    </>
  )
}

function PanelTriaje() {
  const { datos: citas, recargar } = useApi<Cita[]>(
    `/api/citas?fecha=${hoyISO()}`
  )
  const ahora = useReloj(60_000, recargar)
  const enEspera = (citas ?? [])
    .filter((c) => c.estado === "EN_ESPERA_TRIAJE")
    .sort((a, b) => (a.llegadaEn ?? "").localeCompare(b.llegadaEn ?? ""))
  const masAntigua = enEspera[0]?.llegadaEn
    ? minutosDesde(enEspera[0].llegadaEn, ahora)
    : null

  return (
    <>
      <FilaIndicadores>
        <Indicador
          icono={HeartPulse}
          titulo="Esperando triaje"
          valor={citas && enEspera.length}
          destacado
        />
        <Indicador
          icono={Clock}
          titulo="Espera más larga"
          valor={citas && (masAntigua === null ? "—" : `${masAntigua} min`)}
          alerta={masAntigua !== null && masAntigua >= 30}
        />
        <Indicador
          icono={Activity}
          titulo="Triados hoy"
          valor={citas?.filter((c) => c.triajeEn).length}
        />
        <Indicador
          icono={CircleAlert}
          titulo="Urgentes hoy"
          valor={citas?.filter((c) => c.prioridad === "URGENTE").length}
        />
      </FilaIndicadores>
      <ListaCitas
        titulo="En espera de triaje"
        descripcion="Por orden de llegada"
        citas={citas ? enEspera.slice(0, 6) : undefined}
        vacio="No hay pacientes esperando triaje."
        mostrarEspera={ahora}
      />
    </>
  )
}

function PanelMedico() {
  const { datos: citas, recargar } = useApi<Cita[]>(
    `/api/citas?fecha=${hoyISO()}`
  )
  const ahora = useReloj(60_000, recargar)
  const porAtender = (citas ?? [])
    .filter(
      (c) => c.estado === "EN_ESPERA_CONSULTA" || c.estado === "EN_CONSULTA"
    )
    .sort(
      (a, b) =>
        (a.estado === "EN_CONSULTA" ? -1 : 0) -
          (b.estado === "EN_CONSULTA" ? -1 : 0) ||
        (b.prioridad ? NIVEL_PRIORIDAD[b.prioridad] : 0) -
          (a.prioridad ? NIVEL_PRIORIDAD[a.prioridad] : 0) ||
        (a.triajeEn ?? "").localeCompare(b.triajeEn ?? "")
    )
  const urgentes = porAtender.filter((c) => c.prioridad === "URGENTE").length

  return (
    <>
      <FilaIndicadores>
        <Indicador
          icono={Stethoscope}
          titulo="Por atender"
          valor={citas && porAtender.length}
          detalle="ya pasaron por triaje"
          destacado
        />
        <Indicador
          icono={CircleAlert}
          titulo="Urgentes"
          valor={citas && urgentes}
          alerta={urgentes > 0}
        />
        <Indicador
          icono={HeartPulse}
          titulo="En triaje o por llegar"
          valor={
            citas?.filter(
              (c) =>
                c.estado === "EN_ESPERA_TRIAJE" || c.estado === "PROGRAMADA"
            ).length
          }
        />
        <Indicador
          icono={CalendarCheck}
          titulo="Atendidos hoy"
          valor={citas?.filter((c) => c.estado === "ATENDIDO").length}
        />
      </FilaIndicadores>
      <ListaCitas
        titulo="Siguientes pacientes"
        descripcion="Por prioridad y hora de triaje"
        citas={citas ? porAtender.slice(0, 6) : undefined}
        vacio="No hay pacientes esperando consulta."
        mostrarEspera={ahora}
      />
    </>
  )
}

function PanelAdmin() {
  const hoy = fechaLocal(hoyISO())
  const hace7 = new Date(hoy)
  hace7.setDate(hoy.getDate() - 6)
  const desde = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, "0")}-${String(hace7.getDate()).padStart(2, "0")}`
  const { datos: r } = useApi<Reporte>(
    `/api/reportes/resumen?desde=${desde}&hasta=${hoyISO()}`
  )
  const { datos: usuarios } = useApi<Pagina<Usuario>>(
    "/api/usuarios?activo=true&size=1"
  )
  const espera =
    r &&
    r.tiemposEspera.llegadaATriaje !== null &&
    r.tiemposEspera.triajeAConsulta !== null
      ? Math.round(
          r.tiemposEspera.llegadaATriaje + r.tiemposEspera.triajeAConsulta
        )
      : null

  return (
    <>
      <FilaIndicadores>
        <Indicador
          icono={UsersRound}
          titulo="Usuarios activos"
          valor={usuarios?.totalElementos}
        />
        <Indicador
          icono={CalendarCheck}
          titulo="Atenciones"
          valor={r?.totales.atendidas}
          detalle="últimos 7 días"
        />
        <Indicador
          icono={UserRoundX}
          titulo="Inasistencia"
          valor={
            r &&
            (r.totales.tasaInasistencia === null
              ? "—"
              : `${r.totales.tasaInasistencia} %`)
          }
          detalle="últimos 7 días"
        />
        <Indicador
          icono={Clock}
          titulo="Espera promedio"
          valor={r && (espera === null ? "—" : `${espera} min`)}
          detalle="de la llegada a la consulta"
        />
      </FilaIndicadores>
    </>
  )
}

// ---------------------------------------------------------------------------------------------------------------

function FilaIndicadores({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
}

/** Tarjeta de indicador: el número es el protagonista; el icono identifica el dato. */
function Indicador({
  icono: Icono,
  titulo,
  valor,
  detalle,
  destacado = false,
  alerta = false,
}: {
  icono: LucideIcon
  titulo: string
  valor: React.ReactNode | undefined
  detalle?: string
  destacado?: boolean
  alerta?: boolean
}) {
  return (
    <Card className={destacado ? "ring-marca/30" : undefined}>
      <CardContent className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-muted-foreground">{titulo}</span>
          {valor === undefined ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <span
              className={`text-3xl font-semibold tracking-tight ${alerta ? "text-destructive" : "text-foreground"}`}
            >
              {valor}
            </span>
          )}
          {detalle && (
            <span className="text-xs text-muted-foreground">{detalle}</span>
          )}
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            alerta
              ? "bg-destructive/10 text-destructive"
              : "bg-marca-claro text-marca"
          }`}
        >
          <Icono className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}

function ListaCitas({
  titulo,
  descripcion,
  citas,
  vacio,
  mostrarEspera,
}: {
  titulo: string
  descripcion: string
  citas: Cita[] | undefined
  vacio: string
  /** Si se indica, muestra minutos de espera desde la llegada o el triaje. */
  mostrarEspera?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        {!citas ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : citas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {vacio}
          </p>
        ) : (
          <ul className="divide-y">
            {citas.map((c) => {
              const desde =
                c.estado === "EN_ESPERA_TRIAJE" ? c.llegadaEn : c.triajeEn
              return (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {c.paciente.nombreCompleto}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.numeroTurno != null && `Turno ${c.numeroTurno} · `}
                      {c.paciente.edad} · {c.consultorio.nombre}
                      {c.hora && ` · ${formatearHora(c.hora)}`}
                    </span>
                  </span>
                  {mostrarEspera !== undefined && desde && (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {minutosDesde(desde, mostrarEspera)} min
                    </span>
                  )}
                  {c.prioridad ? (
                    <PrioridadEtiqueta prioridad={c.prioridad} />
                  ) : (
                    <EstadoCitaEtiqueta estado={c.estado} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
