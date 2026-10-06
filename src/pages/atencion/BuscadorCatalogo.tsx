import * as React from "react"
import { Plus, Search } from "lucide-react"

import { Input } from "@/components/form"
import { useApi, useDebounce } from "@/lib/useApi"

/**
 * Buscador para agregar un elemento de un catálogo (CIE-10 o medicamentos). Al elegir, limpia la búsqueda.
 * Los resultados se muestran debajo, dentro del flujo de la página (no flotando): las tarjetas recortan lo que
 * sobresale de ellas y una lista flotante quedaba cortada.
 */
export function BuscadorCatalogo<T>({
  ruta,
  placeholder,
  etiqueta,
  clave,
  alElegir,
}: {
  ruta: string
  placeholder: string
  etiqueta: (item: T) => React.ReactNode
  clave: (item: T) => string | number
  alElegir: (item: T) => void
}) {
  const [texto, setTexto] = React.useState("")
  const q = useDebounce(texto.trim(), 250)

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setTexto("")}
        />
      </div>
      {q.length >= 2 && (
        <Resultados
          ruta={`${ruta}?${new URLSearchParams({ q })}`}
          etiqueta={etiqueta}
          clave={clave}
          alElegir={(item) => {
            alElegir(item)
            setTexto("")
          }}
        />
      )}
    </div>
  )
}

function Resultados<T>({
  ruta,
  etiqueta,
  clave,
  alElegir,
}: {
  ruta: string
  etiqueta: (item: T) => React.ReactNode
  clave: (item: T) => string | number
  alElegir: (item: T) => void
}) {
  const { datos } = useApi<T[]>(ruta)
  if (!datos) return null
  return (
    <ul
      className="max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-sm"
      aria-label="Resultados del catálogo"
    >
      {datos.length === 0 && (
        <li className="px-3 py-2 text-muted-foreground">
          Sin resultados en el catálogo.
        </li>
      )}
      {datos.map((item) => (
        <li key={clave(item)}>
          <button
            type="button"
            className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
            onClick={() => alElegir(item)}
          >
            <span className="min-w-0 flex-1">{etiqueta(item)}</span>
            <Plus
              className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
