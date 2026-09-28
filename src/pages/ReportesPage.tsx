import * as React from "react"

import { Alerta, Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      {/* Filtros: una sola fila, arriba de todo */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {PERIODOS.map((p) => {
          const activo = desde === haceDias(p.dias) && hasta === hoyISO()
          return (
            <Button
              key={p.dias}
              size="sm"
              variant={activo ? "secondary" : "ghost"}
              onClick={() => {
                setDesde(haceDias(p.dias))
                setHasta(hoyISO())
              }}
            >
              {activo && "✓ "}
              {p.etiqueta}
            </Button>
          )
        })}
        <span className="ml-2 text-muted-foreground">Desde</span>
        <Input
          type="date"
          className="w-40"
          value={desde}
          max={hasta}
          onChange={(e) => e.target.value && setDesde(e.target.value)}
        />
        <span className="text-muted-foreground">hasta</span>
        <Input
          type="date"
          className="w-40"
          value={hasta}
          max={hoyISO()}
          onChange={(e) => e.target.value && setHasta(e.target.value)}
        />
      </div>

      {error && <Alerta>{error}</Alerta>}
      {!r && !error && <p className="text-muted-foreground">Cargando…</p>}

      {r && (
        <>
          <p className="text-sm text-muted-foreground">
            Del {formatearFecha(r.desde)} al {formatearFecha(r.hasta)}. Cifras
            agregadas; no identifican a ningún paciente.
          </p>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Indicador
              titulo="Atenciones"
              valor={r.totales.atendidas}
              detalle={`de ${r.totales.citas} citas`}
            />
            <Indicador
              titulo="Inasistencia"
              valor={
                r.totales.tasaInasistencia === null
                  ? "—"
                  : `${r.totales.tasaInasistencia} %`
              }
              detalle={`${r.totales.noSePresento} no se presentaron`}
            />
            <Indicador
              titulo="Pacientes nuevos"
              valor={r.totales.pacientesNuevos}
              detalle="registrados en el período"
            />
            <Indicador
              titulo="Cancelaciones"
              valor={r.totales.canceladas}
              detalle="citas canceladas"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Indicador
              titulo="Espera hasta triaje"
              valor={minutos(r.tiemposEspera.llegadaATriaje)}
              detalle="desde la llegada"
            />
            <Indicador
              titulo="Espera hasta consulta"
              valor={minutos(r.tiemposEspera.triajeAConsulta)}
              detalle="desde el triaje"
            />
            <Indicador
              titulo="Duración de la consulta"
              valor={minutos(r.tiemposEspera.duracionConsulta)}
              detalle="promedio"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Atenciones por día</CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnasPorDia
                desde={r.desde}
                hasta={r.hasta}
                datos={r.atencionesPorDia}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Barras
              titulo="Diagnósticos principales más frecuentes"
              datos={r.diagnosticosFrecuentes}
              conCodigo
            />
            <Barras
              titulo="Atenciones por médico"
              datos={r.atencionesPorMedico}
            />
            <Barras
              titulo="Atenciones por consultorio"
              datos={r.atencionesPorConsultorio}
            />
            <Barras
              titulo="Pacientes atendidos por financiamiento"
              datos={r.pacientesPorFinanciamiento.map((c) => ({
                ...c,
                etiqueta:
                  NOMBRE_FINANCIAMIENTO[c.codigo as TipoFinanciamiento] ??
                  c.etiqueta,
              }))}
            />
            <Barras
              titulo="Prioridad asignada en triaje"
              datos={r.prioridades.map((c) => ({
                ...c,
                etiqueta: NOMBRE_PRIORIDAD[c.codigo as Prioridad] ?? c.etiqueta,
              }))}
            />
            <Barras
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

/** Tarjeta de indicador: el número es el protagonista. */
function Indicador({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: React.ReactNode
  detalle: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{titulo}</span>
        <span className="text-3xl font-semibold">{valor}</span>
        <span className="text-xs text-muted-foreground">{detalle}</span>
      </CardContent>
    </Card>
  )
}

/**
 * Barras horizontales de una sola serie (un solo tono): compara magnitudes. Cada fila muestra su etiqueta y su
 * valor escritos, así que se lee como tabla y no depende del color.
 */
function Barras({
  titulo,
  datos,
  conCodigo = false,
}: {
  titulo: string
  datos: Conteo[]
  conCodigo?: boolean
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.total))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {datos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
                    className="h-3 rounded-r-[4px] bg-[var(--viz-serie)]"
                    style={{ width: `${(d.total / maximo) * 85}%` }}
                  />
                  <span className="tabular-nums">{d.total}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
      <p className="text-sm text-muted-foreground">
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
