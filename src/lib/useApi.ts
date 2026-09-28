import * as React from "react"

import { api } from "./api"

/**
 * Carga datos de la API (GET) y los recarga cuando cambia la URL.
 * Si llega una respuesta de una URL anterior (por ejemplo, al escribir rápido en un buscador), se descarta.
 */
export function useApi<T>(url: string) {
  const [datos, setDatos] = React.useState<T | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    let vigente = true
    api<T>(url)
      .then((d) => {
        if (!vigente) return
        setDatos(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (vigente)
          setError(
            e instanceof Error ? e.message : "No se pudieron cargar los datos"
          )
      })
    return () => {
      vigente = false
    }
  }, [url, version])

  const recargar = React.useCallback(() => setVersion((v) => v + 1), [])

  return { datos, error, recargar }
}
