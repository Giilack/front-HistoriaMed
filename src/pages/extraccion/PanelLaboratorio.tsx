import * as React from "react"
import { Ban, FlaskConical } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta } from "@/components/form"
import { Button } from "@/components/ui/button"
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
import { useCambioClinico } from "@/lib/cambiosClinicos"
import { formatearFecha } from "@/lib/fechas"
import type { ResultadoLaboratorio } from "@/lib/types"
import { useApi } from "@/lib/useApi"

/**
 * Resultados de laboratorio del paciente (TRIAJE y MEDICO), del más reciente al más antiguo. Se agregan al
 * validar los datos de un documento; no se borran, el médico los inactiva con un motivo.
 */
export function PanelLaboratorio({ pacienteId }: { pacienteId: number }) {
  const { usuario } = useAuth()
  const esMedico = usuario?.rol === "MEDICO"
  const {
    datos,
    error: errorCarga,
    recargar,
  } = useApi<ResultadoLaboratorio[]>(
    `/api/pacientes/${pacienteId}/resultados-laboratorio`
  )
  useCambioClinico(recargar)
  const [verInactivos, setVerInactivos] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { pedirTexto } = useConfirmacion()

  const activos = datos?.filter((r) => r.activo) ?? []
  const inactivos = datos?.filter((r) => !r.activo) ?? []

  async function inactivar(r: ResultadoLaboratorio) {
    const motivo = await pedirTexto({
      titulo: `¿Inactivar el resultado de ${r.examen}?`,
      descripcion:
        "No se borra: queda en el historial como inactivo, con el motivo.",
      etiqueta: "Motivo",
      placeholder: "ej. valor mal copiado",
      accion: "Inactivar",
      destructivo: true,
    })
    if (!motivo) return
    setError(null)
    try {
      await api(`/api/resultados-laboratorio/${r.id}/inactivar`, {
        method: "PATCH",
        ...json({ motivo }),
      })
      recargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo inactivar")
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}
      {!datos && !errorCarga && <Skeleton className="h-12" />}
      {datos && activos.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-muted-foreground">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          Sin resultados registrados. Se agregan al validar los datos de un
          documento de laboratorio.
        </p>
      )}
      {activos.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Examen</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Fecha</TableHead>
                {esMedico && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.examen}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {r.valor}{" "}
                    <span className="font-normal text-muted-foreground">
                      {r.unidad}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.rangoReferencia ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.fecha ? formatearFecha(r.fecha) : "—"}
                  </TableCell>
                  {esMedico && (
                    <TableCell>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Inactivar ${r.examen}`}
                        onClick={() => inactivar(r)}
                      >
                        <Ban />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="text-xs">
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setVerInactivos((v) => !v)}
          >
            {verInactivos ? "Ocultar" : "Ver"} {inactivos.length} inactivo(s)
          </button>
          {verInactivos && (
            <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
              {inactivos.map((r) => (
                <li key={r.id}>
                  <s>
                    {r.examen}: {r.valor} {r.unidad}
                  </s>{" "}
                  — {r.motivoInactivacion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
