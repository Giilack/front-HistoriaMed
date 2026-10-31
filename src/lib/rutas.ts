import * as React from "react"

import type { Vista } from "@/lib/navegacion"

/**
 * Dirección de cada módulo. La dirección solo indica qué pantalla abrir: los permisos los decide siempre el backend, y
 * nunca lleva datos del paciente, solo su identificador interno.
 */
export const RUTA_VISTA: Record<Vista, string> = {
  inicio: "/inicio",
  citas: "/citas",
  colaTriaje: "/cola-triaje",
  misPacientes: "/mis-pacientes",
  pacientes: "/pacientes",
  importacion: "/importacion",
  usuarios: "/usuarios",
  consultorios: "/consultorios",
  reportes: "/reportes",
  auditoria: "/auditoria",
}

const AVISO = "historiamed:ruta"

function suscribir(avisar: () => void) {
  window.addEventListener("popstate", avisar)
  window.addEventListener(AVISO, avisar)
  return () => {
    window.removeEventListener("popstate", avisar)
    window.removeEventListener(AVISO, avisar)
  }
}

/** La ruta actual; la pantalla se actualiza al navegar y con los botones atrás y adelante del navegador. */
export function useRuta() {
  return React.useSyncExternalStore(suscribir, () => window.location.pathname)
}

export function irA(ruta: string, reemplazar = false) {
  if (ruta === window.location.pathname) return
  if (reemplazar) window.history.replaceState(null, "", ruta)
  else window.history.pushState(null, "", ruta)
  window.dispatchEvent(new Event(AVISO))
}

/** La vista a la que pertenece una ruta, o null si no existe. */
export function vistaDeRuta(ruta: string): Vista | null {
  if (ruta === "/") return "inicio"
  const entrada = Object.entries(RUTA_VISTA).find(
    ([, r]) => ruta === r || ruta.startsWith(`${r}/`)
  )
  return entrada ? (entrada[0] as Vista) : null
}

/** Partes de la ruta después del módulo: en /pacientes/18/documentos devuelve ["18", "documentos"]. */
export function partesDeRuta(ruta: string, modulo: Vista) {
  return ruta.slice(RUTA_VISTA[modulo].length).split("/").filter(Boolean)
}
