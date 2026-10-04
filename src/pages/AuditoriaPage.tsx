import * as React from "react"
import { CalendarRange, RefreshCw, ScrollText, Search } from "lucide-react"

import { Alerta, Input, Select } from "@/components/form"
import { EncabezadoPagina, EstadoVacio, Paginacion } from "@/components/pagina"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Pagina, RegistroAuditoria } from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"

const ACCIONES = [
  "LOGIN_EXITOSO",
  "LOGIN_FALLIDO",
  "CUENTA_BLOQUEADA",
  "LOGOUT",
  "CAMBIO_PASSWORD",
  "REFRESH_REUTILIZADO",
  "VER",
  "CREAR",
  "EDITAR",
  "ACTIVAR",
  "DESACTIVAR",
  "RESETEAR_PASSWORD",
  "CERRAR",
  "DESCARGAR",
  "VALIDAR",
]

// Acciones que merecen atención del administrador
const ALERTAS = new Set([
  "LOGIN_FALLIDO",
  "CUENTA_BLOQUEADA",
  "REFRESH_REUTILIZADO",
])

// Accesos y sesiones (no son alertas)
const SESION = new Set(["LOGIN_EXITOSO", "LOGOUT", "CAMBIO_PASSWORD"])

function estiloAccion(accion: string) {
  if (ALERTAS.has(accion)) return "bg-destructive/12 text-destructive"
  if (SESION.has(accion))
    return "bg-marca-claro text-marca-oscuro dark:bg-muted dark:text-foreground"
  if (accion === "VER") return "bg-muted text-muted-foreground"
  return "bg-green-600/12 text-green-700 dark:text-green-400"
}

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "medium",
})

/** Convierte "2026-09-27" (hora local) a un instante ISO; `finDelDia` suma un día. */
function aInstante(fecha: string, finDelDia = false) {
  const d = new Date(`${fecha}T00:00:00`)
  if (finDelDia) d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export function AuditoriaPage() {
  const [numPagina, setNumPagina] = React.useState(0)
  const [username, setUsername] = React.useState("")
  const [accion, setAccion] = React.useState("")
  const [desde, setDesde] = React.useState("")
  const [hasta, setHasta] = React.useState("")

  const params = new URLSearchParams({ page: String(numPagina), size: "20" })
  if (username.trim()) params.set("username", username.trim())
  if (accion) params.set("accion", accion)
  if (desde) params.set("desde", aInstante(desde))
  if (hasta) params.set("hasta", aInstante(hasta, true))
  const {
    datos: pagina,
    error,
    recargar,
  } = useApi<Pagina<RegistroAuditoria>>(`/api/auditoria?${params}`)

  function filtro<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setNumPagina(0)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Registro inalterable de accesos y operaciones. Las alertas de seguridad se muestran en rojo."
        acciones={
          <Button variant="outline" onClick={recargar}>
            <RefreshCw />
            Actualizar
          </Button>
        }
      />

      {error && <Alerta>{error}</Alerta>}

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-4 text-sm">
          <div className="relative w-44">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Usuario exacto"
              aria-label="Usuario"
              className="pl-9"
              value={username}
              onChange={(e) => filtro(setUsername)(e.target.value)}
            />
          </div>
          <Select
            className="w-56"
            aria-label="Acción"
            value={accion}
            onChange={(e) => filtro(setAccion)(e.target.value)}
          >
            <option value="">Todas las acciones</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="date"
              className="w-40"
              aria-label="Desde"
              value={desde}
              onChange={(e) => filtro(setDesde)(e.target.value)}
            />
            <span className="text-muted-foreground">a</span>
            <Input
              type="date"
              className="w-40"
              aria-label="Hasta"
              value={hasta}
              onChange={(e) => filtro(setHasta)(e.target.value)}
            />
          </div>
        </div>

        {pagina?.contenido.length === 0 ? (
          <EstadoVacio
            icono={ScrollText}
            titulo="No hay registros con esos filtros"
            descripcion="Amplíe el rango de fechas o quite algún filtro."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead className="pr-4">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pagina
                ? [0, 1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : pagina.contenido.map((r) => (
                    <TableRow
                      key={r.id}
                      className={cn(
                        ALERTAS.has(r.accion) &&
                          "bg-destructive/5 hover:bg-destructive/10"
                      )}
                    >
                      <TableCell className="pl-4 whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatoFecha.format(new Date(r.fecha))}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{r.username ?? "—"}</span>
                        {r.rol && (
                          <span className="block text-xs text-muted-foreground">
                            {r.rol}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-medium whitespace-nowrap",
                            estiloAccion(r.accion)
                          )}
                        >
                          {r.accion}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.recurso}
                        {r.recursoId && (
                          <span className="text-muted-foreground">
                            {" "}
                            #{r.recursoId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-96 truncate pr-4 whitespace-nowrap text-muted-foreground">
                        <span title={r.detalle ?? undefined}>
                          {r.detalle ?? ""}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}

        {pagina && (
          <Paginacion
            pagina={pagina.pagina}
            totalPaginas={pagina.totalPaginas}
            totalElementos={pagina.totalElementos}
            unidad="registros"
            alCambiar={setNumPagina}
          />
        )}
      </Card>
    </div>
  )
}
