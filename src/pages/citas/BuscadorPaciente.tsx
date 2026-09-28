import * as React from "react"

import { Input } from "@/components/form"
import { Button } from "@/components/ui/button"
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
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          <span className="font-mono text-muted-foreground">
            {seleccionado.numeroHc}
          </span>{" "}
          <b>{seleccionado.nombreCompleto}</b> · {seleccionado.edad}
          {seleccionado.numeroDocumento && ` · ${seleccionado.numeroDocumento}`}
        </span>
        <Button
          type="button"
          size="xs"
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
      <Input
        placeholder="Buscar paciente por DNI, HC o nombre…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
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
  if (!datos) return <p className="text-xs text-muted-foreground">Buscando…</p>
  if (datos.contenido.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin resultados. Si es un paciente nuevo, regístrelo primero en
        «Pacientes».
      </p>
    )
  }
  return (
    <ul className="divide-y rounded-md border text-sm">
      {datos.contenido.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-muted/50"
            onClick={() => alElegir(p)}
          >
            <span className="font-mono text-muted-foreground">
              {p.numeroHc}
            </span>{" "}
            <b>{p.nombreCompleto}</b> · {p.edad}
            {p.numeroDocumento && ` · ${p.numeroDocumento}`}
          </button>
        </li>
      ))}
    </ul>
  )
}
