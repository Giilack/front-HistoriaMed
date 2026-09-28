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

  // setDatos permite reemplazar los datos con la respuesta de una edición, sin volver a pedirlos
  return { datos, error, recargar, setDatos }
}

/** Devuelve el valor después de que deja de cambiar durante `ms` (evita una búsqueda por cada tecla). */
export function useDebounce<T>(valor: T, ms = 300) {
  const [retrasado, setRetrasado] = React.useState(valor)
  React.useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retrasado
}

/**
 * Hora actual que se actualiza cada `ms` y ejecuta `alTick` en cada actualización.
 * Sirve para refrescar colas y mostrar tiempos de espera que avanzan.
 */
export function useReloj(ms: number, alTick?: () => void) {
  const [ahora, setAhora] = React.useState(() => Date.now())
  const tick = React.useRef(alTick)
  React.useEffect(() => {
    tick.current = alTick
  })
  React.useEffect(() => {
    const id = setInterval(() => {
      setAhora(Date.now())
      tick.current?.()
    }, ms)
    return () => clearInterval(id)
  }, [ms])
  return ahora
}
