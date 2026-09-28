import * as React from "react"

const MOBILE_BREAKPOINT = 768
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function suscribir(avisar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", avisar)
  return () => mql.removeEventListener("change", avisar)
}

/** true en pantallas de celular (menos de 768 px). Se actualiza al cambiar el tamaño de la ventana. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  )
}
