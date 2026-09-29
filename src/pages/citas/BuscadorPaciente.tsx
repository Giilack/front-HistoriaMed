import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Pagina, PacienteResumen } from "@/lib/types"
import { useApi, useDebounce } from "@/lib/useApi"

/**
 * Buscar y elegir un paciente (por DNI, HC o nombre). Muestra el elegido con opción de cambiarlo.
 */
export function BuscadorPaciente({
  seleccionado,
  alElegir,
  error,
}: {
  seleccionado: PacienteResumen | null
  alElegir: (p: PacienteResumen | null) => void
  error?: string
}) {
  const [texto, setTexto] = React.useState("")
  const q = useDebounce(texto.trim())

  if (seleccionado) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-marca/30 bg-marca-claro/50 px-3 py-2 dark:bg-muted">
        <span className="min-w-0 flex-1 text-sm">
          <b className="block truncate">{seleccionado.nombreCompleto}</b>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{seleccionado.numeroHc}</span> ·{" "}
            {seleccionado.edad}
            {seleccionado.numeroDocumento &&
              ` · ${seleccionado.numeroDocumento}`}
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => alElegir(null)}
        >
          Cambiar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Buscar por DNI, HC o nombre…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <span className="text-xs font-medium text-destructive">{error}</span>
      )}
      {q.length >= 2 && <Resultados q={q} alElegir={alElegir} />}
    </div>
  )
}

function Resultados({
  q,
  alElegir,
}: {
  q: string
  alElegir: (p: PacienteResumen) => void
}) {
  const { datos } = useApi<Pagina<PacienteResumen>>(
    `/api/pacientes?${new URLSearchParams({ q, size: "6" })}`
  )
  if (!datos) return <Skeleton className="h-12 w-full" />
  if (datos.contenido.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Sin resultados. Si es un paciente nuevo, regístrelo primero en
        «Pacientes».
      </p>
    )
  }
  return (
    <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border bg-card text-sm">
      {datos.contenido.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-marca-claro/50 focus-visible:bg-marca-claro/50 focus-visible:outline-none dark:hover:bg-muted"
            onClick={() => alElegir(p)}
          >
            <span className="min-w-0 flex-1">
              <b className="block truncate font-medium">{p.nombreCompleto}</b>
              <span className="text-xs text-muted-foreground">
                <span className="font-mono">{p.numeroHc}</span> · {p.edad}
                {p.numeroDocumento && ` · ${p.numeroDocumento}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
