import * as React from "react"

import { Alerta, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import type { Pagina, RegistroAuditoria } from "@/lib/types"
import { useApi } from "@/lib/useApi"

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
]

// Acciones que merecen atención del administrador
const ALERTAS = new Set([
  "LOGIN_FALLIDO",
  "CUENTA_BLOQUEADA",
  "REFRESH_REUTILIZADO",
])

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <Button variant="outline" onClick={recargar}>
          Actualizar
        </Button>
      </div>

      {error && <Alerta>{error}</Alerta>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          placeholder="Usuario exacto"
          className="w-40"
          value={username}
          onChange={(e) => filtro(setUsername)(e.target.value)}
        />
        <Select
          className="w-52"
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
        <span>Desde</span>
        <Input
          type="date"
          className="w-40"
          value={desde}
          onChange={(e) => filtro(setDesde)(e.target.value)}
        />
        <span>Hasta</span>
        <Input
          type="date"
          className="w-40"
          value={hasta}
          onChange={(e) => filtro(setHasta)(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Acción</th>
              <th className="px-3 py-2 font-medium">Recurso</th>
              <th className="px-3 py-2 font-medium">Detalle</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {pagina?.contenido.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatoFecha.format(new Date(r.fecha))}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono">{r.username ?? "—"}</span>
                  {r.rol && (
                    <span className="text-muted-foreground"> · {r.rol}</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 font-medium ${ALERTAS.has(r.accion) ? "text-destructive" : ""}`}
                >
                  {r.accion}
                </td>
                <td className="px-3 py-2">
                  {r.recurso}
                  {r.recursoId && (
                    <span className="text-muted-foreground">
                      {" "}
                      #{r.recursoId}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.detalle ?? ""}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.ip ?? ""}</td>
              </tr>
            ))}
            {pagina?.contenido.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay registros con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagina && pagina.totalPaginas > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={numPagina === 0}
            onClick={() => setNumPagina((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {pagina.pagina + 1} de {pagina.totalPaginas} (
            {pagina.totalElementos} registros)
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={numPagina + 1 >= pagina.totalPaginas}
            onClick={() => setNumPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
