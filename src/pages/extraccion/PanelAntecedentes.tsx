import * as React from "react"
import { Ban, History } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, json } from "@/lib/api"
import { useCambioClinico } from "@/lib/cambiosClinicos"
import { formatearFecha } from "@/lib/fechas"
import { NOMBRE_TIPO_ANTECEDENTE, type Antecedente } from "@/lib/types"
import { useApi } from "@/lib/useApi"

/**
 * Antecedentes del paciente (TRIAJE y MEDICO): personales, familiares, quirúrgicos, diagnósticos previos y
 * medicación habitual. Se agregan al validar los datos de un documento; no se borran, el médico los inactiva.
 */
export function PanelAntecedentes({ pacienteId }: { pacienteId: number }) {
  const { usuario } = useAuth()
  const esMedico = usuario?.rol === "MEDICO"
  const {
    datos,
    error: errorCarga,
    recargar,
  } = useApi<Antecedente[]>(`/api/pacientes/${pacienteId}/antecedentes`)
  useCambioClinico(recargar)
  const [verInactivos, setVerInactivos] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { pedirTexto } = useConfirmacion()

  const activos = datos?.filter((a) => a.activo) ?? []
  const inactivos = datos?.filter((a) => !a.activo) ?? []

  async function inactivar(a: Antecedente) {
    const motivo = await pedirTexto({
      titulo: `¿Inactivar «${a.descripcion}»?`,
      descripcion:
        "No se borra: queda en el historial como inactivo, con el motivo.",
      etiqueta: "Motivo",
      placeholder: "ej. registrado por error",
      accion: "Inactivar",
      destructivo: true,
    })
    if (!motivo) return
    setError(null)
    try {
      await api(`/api/antecedentes/${a.id}/inactivar`, {
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
          <History className="size-4 shrink-0" aria-hidden />
          Sin antecedentes registrados. Se agregan al validar los datos de un
          documento.
        </p>
      )}
      {activos.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {activos.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">
                    {NOMBRE_TIPO_ANTECEDENTE[a.tipo]}
                  </Badge>
                  {a.cieCodigo && (
                    <Badge variant="outline" className="font-mono">
                      {a.cieCodigo}
                    </Badge>
                  )}
                  <b>{a.descripcion}</b>
                </div>
                <span className="block text-xs text-muted-foreground">
                  {a.detalle && `${a.detalle} · `}
                  {a.fecha && `${formatearFecha(a.fecha)} · `}
                  validado por {a.registradoPor}
                </span>
              </div>
              {esMedico && (
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => inactivar(a)}
                >
                  <Ban />
                  Inactivar
                </Button>
              )}
            </li>
          ))}
        </ul>
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
              {inactivos.map((a) => (
                <li key={a.id}>
                  <s>{a.descripcion}</s> — {a.motivoInactivacion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
