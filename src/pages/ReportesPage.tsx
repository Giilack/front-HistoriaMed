import * as React from "react"
import {
  Activity,
  CalendarRange,
  CalendarX2,
  ChartColumn,
  ClipboardPlus,
  Clock,
  DoorOpen,
  Hourglass,
  ListChecks,
  ShieldCheck,
  Siren,
  Stethoscope,
  Timer,
  UserPlus,
  UserRoundX,
  type LucideIcon,
} from "lucide-react"

import { Alerta, Input } from "@/components/form"
import { EncabezadoPagina, SeccionTarjeta } from "@/components/pagina"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fechaLocal, formatearFecha, hoyISO } from "@/lib/fechas"
import {
  NOMBRE_ESTADO_CITA,
  NOMBRE_FINANCIAMIENTO,
  NOMBRE_PRIORIDAD,
  type Conteo,
  type EstadoCita,
  type Prioridad,
  type Reporte,
  type TipoFinanciamiento,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"

/** Fecha ISO de hace `dias` días. */
function haceDias(dias: number) {
  const d = fechaLocal(hoyISO())
  d.setDate(d.getDate() - dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const PERIODOS = [
  { etiqueta: "Últimos 7 días", dias: 6 },
  { etiqueta: "Últimos 30 días", dias: 29 },
  { etiqueta: "Últimos 90 días", dias: 89 },
]

/**
 * Reportes de gestión (ADMIN). Solo cifras agregadas: ningún dato identifica a un paciente
 * (plan.md, principio P1).
 */
export function ReportesPage() {
  const [desde, setDesde] = React.useState(haceDias(29))
  const [hasta, setHasta] = React.useState(hoyISO())
  const { datos: r, error } = useApi<Reporte>(
    `/api/reportes/resumen?${new URLSearchParams({ desde, hasta })}`
  )

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Reportes"
        descripcion={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-marca" aria-hidden />
            Cifras agregadas del establecimiento; no identifican a ningún
            paciente.
          </span>
        }
      />

      {/* Filtros: una sola fila, arriba de todo */}
      <Card className="flex-row flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <div
          className="inline-flex rounded-lg bg-muted p-1"
          role="group"
          aria-label="Período rápido"
        >
          {PERIODOS.map((p) => {
            const activo = desde === haceDias(p.dias) && hasta === hoyISO()
            return (
              <button
                key={p.dias}
                type="button"
                aria-pressed={activo}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  activo
                    ? "bg-card text-marca-oscuro shadow-xs dark:text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setDesde(haceDias(p.dias))
                  setHasta(hoyISO())
                }}
              >
                {p.etiqueta}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
          <Input
            type="date"
            className="w-40"
            aria-label="Desde"
            value={desde}
            max={hasta}
            onChange={(e) => e.target.value && setDesde(e.target.value)}
          />
          <span className="text-muted-foreground">a</span>
          <Input
            type="date"
            className="w-40"
            aria-label="Hasta"
            value={hasta}
            max={hoyISO()}
            onChange={(e) => e.target.value && setHasta(e.target.value)}
          />
        </div>
        {r && (
          <span className="text-muted-foreground lg:ml-auto">
            Del {formatearFecha(r.desde)} al {formatearFecha(r.hasta)}
          </span>
        )}
      </Card>

      {error && <Alerta>{error}</Alerta>}

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icono={Stethoscope}
          titulo="Atenciones"
          valor={r?.totales.atendidas}
          detalle={r && `de ${r.totales.citas} citas`}
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
          detalle={r && `${r.totales.noSePresento} no se presentaron`}
        />
        <Indicador
          icono={UserPlus}
          titulo="Pacientes nuevos"
          valor={r?.totales.pacientesNuevos}
          detalle="registrados en el período"
        />
        <Indicador
          icono={CalendarX2}
          titulo="Cancelaciones"
          valor={r?.totales.canceladas}
          detalle="citas canceladas"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Indicador
          icono={Hourglass}
          titulo="Espera hasta triaje"
          valor={r && minutos(r.tiemposEspera.llegadaATriaje)}
          detalle="promedio desde la llegada"
        />
        <Indicador
          icono={Clock}
          titulo="Espera hasta consulta"
          valor={r && minutos(r.tiemposEspera.triajeAConsulta)}
          detalle="promedio desde el triaje"
        />
        <Indicador
          icono={Timer}
          titulo="Duración de la consulta"
          valor={r && minutos(r.tiemposEspera.duracionConsulta)}
          detalle="promedio"
        />
      </div>

      {!r && !error && <Skeleton className="h-64 rounded-xl" />}

      {r && (
        <>
          <SeccionTarjeta icono={ChartColumn} titulo="Atenciones por día">
            <ColumnasPorDia
              desde={r.desde}
              hasta={r.hasta}
              datos={r.atencionesPorDia}
            />
          </SeccionTarjeta>

          <div className="grid gap-4 lg:grid-cols-2">
            <Barras
              icono={ClipboardPlus}
              titulo="Diagnósticos principales más frecuentes"
              datos={r.diagnosticosFrecuentes}
              conCodigo
            />
            <Barras
              icono={Stethoscope}
              titulo="Atenciones por médico"
              datos={r.atencionesPorMedico}
            />
            <Barras
              icono={DoorOpen}
              titulo="Atenciones por consultorio"
              datos={r.atencionesPorConsultorio}
            />
            <Barras
              icono={ShieldCheck}
              titulo="Pacientes atendidos por financiamiento"
              datos={r.pacientesPorFinanciamiento.map((c) => ({
                ...c,
                etiqueta:
                  NOMBRE_FINANCIAMIENTO[c.codigo as TipoFinanciamiento] ??
                  c.etiqueta,
              }))}
            />
            <Barras
              icono={Siren}
              titulo="Prioridad asignada en triaje"
              datos={r.prioridades.map((c) => ({
                ...c,
                etiqueta: NOMBRE_PRIORIDAD[c.codigo as Prioridad] ?? c.etiqueta,
              }))}
            />
            <Barras
              icono={ListChecks}
              titulo="Citas por estado"
              datos={r.citasPorEstado.map((c) => ({
                ...c,
                etiqueta:
                  NOMBRE_ESTADO_CITA[c.codigo as EstadoCita] ?? c.etiqueta,
              }))}
            />
          </div>
        </>
      )}
    </div>
  )
}

function minutos(valor: number | null) {
  return valor === null ? "—" : `${Math.round(valor)} min`
}

/** Tarjeta de indicador: el número es el protagonista; `valor` indefinido = cargando. */
function Indicador({
  icono: Icono,
  titulo,
  valor,
  detalle,
}: {
  icono: LucideIcon
  titulo: string
  valor: React.ReactNode | undefined
  detalle?: string | null
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-muted-foreground">{titulo}</span>
          {valor === undefined ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {valor}
            </span>
          )}
          {detalle && (
            <span className="text-xs text-muted-foreground">{detalle}</span>
          )}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-marca-claro text-marca dark:bg-muted">
          <Icono className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}

/**
 * Barras horizontales de una sola serie (un solo tono): compara magnitudes. Cada fila muestra su etiqueta y su
 * valor escritos, así que se lee como tabla y no depende del color.
 */
function Barras({
  icono,
  titulo,
  datos,
  conCodigo = false,
}: {
  icono: LucideIcon
  titulo: string
  datos: Conteo[]
  conCodigo?: boolean
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.total))
  return (
    <SeccionTarjeta icono={icono} titulo={titulo}>
      {datos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <Activity className="size-4" aria-hidden />
          Sin datos en el período.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {datos.map((d) => (
            <li
              key={d.codigo}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
            >
              <span className="truncate" title={d.etiqueta}>
                {conCodigo && (
                  <span className="font-mono text-muted-foreground">
                    {d.codigo}{" "}
                  </span>
                )}
                {d.etiqueta}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-3 min-w-0.5 rounded-r-[4px] bg-[var(--viz-serie)]"
                  style={{ width: `${(d.total / maximo) * 85}%` }}
                />
                <span className="font-medium tabular-nums">{d.total}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SeccionTarjeta>
  )
}

/** Columnas por día (incluye los días sin atenciones, para no deformar la línea de tiempo). */
function ColumnasPorDia({
  desde,
  hasta,
  datos,
}: {
  desde: string
  hasta: string
  datos: { fecha: string; total: number }[]
}) {
  const [activo, setActivo] = React.useState<number | null>(null)
  const dias = React.useMemo(() => {
    const porFecha = new Map(datos.map((d) => [d.fecha, d.total]))
    const lista: { fecha: string; total: number }[] = []
    const d = fechaLocal(desde)
    const fin = fechaLocal(hasta)
    while (d <= fin) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      lista.push({ fecha: iso, total: porFecha.get(iso) ?? 0 })
      d.setDate(d.getDate() + 1)
    }
    return lista
  }, [desde, hasta, datos])
  const maximo = Math.max(1, ...dias.map((d) => d.total))
  const total = dias.reduce((s, d) => s + d.total, 0)
  const seleccionado = activo !== null ? dias[activo] : null

  if (total === 0)
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        <Activity className="size-4" aria-hidden />
        Sin atenciones en el período.
      </p>
    )

  return (
    <div className="flex flex-col gap-2">
      <p className="h-5 text-sm" aria-live="polite">
        {seleccionado ? (
          <>
            <b>{formatearFecha(seleccionado.fecha)}</b>: {seleccionado.total}{" "}
            atención(es)
          </>
        ) : (
          <span className="text-muted-foreground">
            Pase el cursor sobre una columna para ver el detalle. Máximo en un
            día: {maximo}.
          </span>
        )}
      </p>
      <div
        className="flex h-40 items-end border-b border-[var(--viz-grilla)]"
        role="img"
        aria-label={`Atenciones por día: ${total} en ${dias.length} días, máximo ${maximo} en un día`}
        onMouseLeave={() => setActivo(null)}
      >
        {dias.map((d, i) => (
          // La zona sensible es toda la altura de la columna, no solo la barra
          <div
            key={d.fecha}
            className="flex h-full flex-1 items-end px-px"
            onMouseEnter={() => setActivo(i)}
            onFocus={() => setActivo(i)}
            tabIndex={0}
          >
            <div
              className={`w-full rounded-t-[4px] bg-[var(--viz-serie)] ${activo === i ? "opacity-100" : activo === null ? "opacity-90" : "opacity-50"}`}
              style={{ height: d.total ? `${(d.total / maximo) * 100}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatearFecha(desde)}</span>
        <span>{formatearFecha(hasta)}</span>
      </div>
    </div>
  )
}
