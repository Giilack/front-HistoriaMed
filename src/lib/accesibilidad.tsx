/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

export type TamanoTexto = "normal" | "grande" | "muy-grande"

export interface Preferencias {
  tamano: TamanoTexto
  altoContraste: boolean
  reducirMovimiento: boolean
  subrayarEnlaces: boolean
}

interface Estado extends Preferencias {
  cambiar: (cambios: Partial<Preferencias>) => void
  restablecer: () => void
}

const CLAVE = "historiamed.accesibilidad"

const POR_DEFECTO: Preferencias = {
  tamano: "normal",
  altoContraste: false,
  reducirMovimiento: false,
  subrayarEnlaces: false,
}

const Contexto = React.createContext<Estado | undefined>(undefined)

function leer(): Preferencias {
  try {
    const guardado = window.localStorage.getItem(CLAVE)
    return guardado
      ? { ...POR_DEFECTO, ...(JSON.parse(guardado) as Partial<Preferencias>) }
      : POR_DEFECTO
  } catch {
    // Sin almacenamiento (modo privado o bloqueado) la aplicación funciona igual
    return POR_DEFECTO
  }
}

function aplicar(p: Preferencias) {
  const raiz = document.documentElement
  raiz.dataset.tamano = p.tamano
  raiz.toggleAttribute("data-alto-contraste", p.altoContraste)
  raiz.toggleAttribute("data-sin-movimiento", p.reducirMovimiento)
  raiz.toggleAttribute("data-subrayar-enlaces", p.subrayarEnlaces)
}

/** Preferencias de accesibilidad del navegador: se recuerdan en este equipo, también antes de iniciar sesión. */
export function AccesibilidadProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [preferencias, setPreferencias] = React.useState(leer)

  React.useLayoutEffect(() => {
    aplicar(preferencias)
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(preferencias))
    } catch {
      // Se aplica solo en esta visita
    }
  }, [preferencias])

  const valor = React.useMemo<Estado>(
    () => ({
      ...preferencias,
      cambiar: (cambios) => setPreferencias((p) => ({ ...p, ...cambios })),
      restablecer: () => setPreferencias(POR_DEFECTO),
    }),
    [preferencias]
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAccesibilidad() {
  const contexto = React.useContext(Contexto)
  if (!contexto) {
    throw new Error("useAccesibilidad requiere AccesibilidadProvider")
  }
  return contexto
}
