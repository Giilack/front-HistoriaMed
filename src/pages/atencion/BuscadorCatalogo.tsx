import * as React from "react"

import { Input } from "@/components/form"
import { useApi, useDebounce } from "@/lib/useApi"

/**
 * Buscador para agregar un elemento de un catálogo (CIE-10 o medicamentos). Al elegir, limpia la búsqueda.
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
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
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
    <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-background text-sm shadow-md">
      {datos.length === 0 && (
        <li className="px-3 py-2 text-muted-foreground">
          Sin resultados en el catálogo.
        </li>
      )}
      {datos.map((item) => (
        <li key={clave(item)}>
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-muted"
            onClick={() => alElegir(item)}
          >
            {etiqueta(item)}
          </button>
        </li>
      ))}
    </ul>
  )
}
