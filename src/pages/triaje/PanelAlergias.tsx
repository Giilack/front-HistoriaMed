import * as React from "react"
import { Ban, Plus, ShieldCheck } from "lucide-react"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { ApiError, api, json } from "@/lib/api"
import {
  NOMBRE_GRAVEDAD,
  NOMBRE_TIPO_ALERGIA,
  type Alergia,
  type GravedadAlergia,
  type TipoAlergia,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"

const ESTILO_GRAVEDAD: Record<
  GravedadAlergia,
  { etiqueta: string; borde: string }
> = {
  LEVE: {
    etiqueta: "bg-muted text-muted-foreground",
    borde: "border-l-border",
  },
  MODERADA: {
    etiqueta: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    borde: "border-l-amber-500",
  },
  SEVERA: {
    etiqueta: "bg-destructive/12 font-semibold text-destructive",
    borde: "border-l-destructive",
  },
}

/**
 * Alergias del paciente (TRIAJE y MEDICO). "Sin alergias registradas" no significa "no tiene alergias":
 * solo que nadie las registró todavía.
 */
export function PanelAlergias({ pacienteId }: { pacienteId: number }) {
  const {
    datos: alergias,
    error: errorCarga,
    recargar,
  } = useApi<Alergia[]>(`/api/pacientes/${pacienteId}/alergias`)
  const [agregando, setAgregando] = React.useState(false)
  const [verInactivas, setVerInactivas] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const activas = alergias?.filter((a) => a.activa) ?? []
  const inactivas = alergias?.filter((a) => !a.activa) ?? []

  const { pedirTexto } = useConfirmacion()

  async function inactivar(a: Alergia) {
    const motivo = await pedirTexto({
      titulo: `¿Inactivar la alergia a ${a.sustancia}?`,
      descripcion:
        "No se borra: queda en el historial como inactiva, con el motivo.",
      etiqueta: "Motivo",
      placeholder: "ej. registrada por error",
      accion: "Inactivar",
      destructivo: true,
    })
    if (!motivo) return
    setError(null)
    try {
      await api(`/api/alergias/${a.id}/inactivar`, {
        method: "PATCH",
        ...json({ motivo }),
      })
      recargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo inactivar")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}
      {alergias && activas.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Sin alergias registradas. Pregunte al paciente.
        </p>
      )}
      {activas.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {activas.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex items-start justify-between gap-2 rounded-lg border border-l-4 bg-card px-3 py-2",
                ESTILO_GRAVEDAD[a.gravedad].borde
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b>{a.sustancia}</b>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px]",
                      ESTILO_GRAVEDAD[a.gravedad].etiqueta
                    )}
                  >
                    {NOMBRE_GRAVEDAD[a.gravedad]}
                  </span>
                </div>
                <span className="block text-xs text-muted-foreground">
                  {NOMBRE_TIPO_ALERGIA[a.tipo]}
                  {a.reaccion && ` · ${a.reaccion}`}
                </span>
              </div>
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => inactivar(a)}
              >
                <Ban />
                Inactivar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {agregando ? (
        <FormularioAlergia
          pacienteId={pacienteId}
          alGuardar={() => {
            setAgregando(false)
            recargar()
          }}
          alCancelar={() => setAgregando(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => setAgregando(true)}
        >
          <Plus />
          Registrar alergia
        </Button>
      )}

      {inactivas.length > 0 && (
        <div className="text-xs">
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setVerInactivas((v) => !v)}
          >
            {verInactivas ? "Ocultar" : "Ver"} {inactivas.length} inactiva(s)
          </button>
          {verInactivas && (
            <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
              {inactivas.map((a) => (
                <li key={a.id}>
                  <s>{a.sustancia}</s> — {a.motivoInactivacion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function FormularioAlergia({
  pacienteId,
  alGuardar,
  alCancelar,
}: {
  pacienteId: number
  alGuardar: () => void
  alCancelar: () => void
}) {
  const [tipo, setTipo] = React.useState<TipoAlergia>("MEDICAMENTO")
  const [sustancia, setSustancia] = React.useState("")
  const [reaccion, setReaccion] = React.useState("")
  const [gravedad, setGravedad] = React.useState<GravedadAlergia>("MODERADA")
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  // Formulario anidado dentro del de triaje: no se usa <form> (los formularios HTML no se pueden anidar)
  async function guardar() {
    if (!sustancia.trim()) {
      setError("Indique la sustancia")
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await api(`/api/pacientes/${pacienteId}/alergias`, {
        method: "POST",
        ...json({ tipo, sustancia, reaccion: reaccion || null, gravedad }),
      })
      alGuardar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      {error && <Alerta>{error}</Alerta>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Tipo">
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoAlergia)}
          >
            {(Object.keys(NOMBRE_TIPO_ALERGIA) as TipoAlergia[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO_ALERGIA[t]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Sustancia">
          <Input
            value={sustancia}
            onChange={(e) => setSustancia(e.target.value)}
            maxLength={100}
            placeholder="ej. Penicilina"
          />
        </Campo>
        <Campo label="Reacción (opcional)">
          <Input
            value={reaccion}
            onChange={(e) => setReaccion(e.target.value)}
            maxLength={200}
            placeholder="ej. urticaria"
          />
        </Campo>
        <Campo label="Gravedad">
          <Select
            value={gravedad}
            onChange={(e) => setGravedad(e.target.value as GravedadAlergia)}
          >
            {(Object.keys(NOMBRE_GRAVEDAD) as GravedadAlergia[]).map((g) => (
              <option key={g} value={g}>
                {NOMBRE_GRAVEDAD[g]}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={enviando} onClick={guardar}>
          {enviando ? "Guardando…" : "Guardar alergia"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
