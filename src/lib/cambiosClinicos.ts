import * as React from "react"

const EVENTO = "historiamed:cambio-clinico"

/**
 * Avisa que cambiaron los datos clínicos del paciente (por ejemplo, al validar los datos de un documento, que
 * agrega alergias, antecedentes y resultados). Los paneles que los muestran se recargan solos.
 */
export function avisarCambioClinico() {
  window.dispatchEvent(new Event(EVENTO))
}

/** Ejecuta `alCambiar` (normalmente, recargar la lista) cuando otro componente avisa un cambio clínico. */
export function useCambioClinico(alCambiar: () => void) {
  React.useEffect(() => {
    window.addEventListener(EVENTO, alCambiar)
    return () => window.removeEventListener(EVENTO, alCambiar)
  }, [alCambiar])
}
