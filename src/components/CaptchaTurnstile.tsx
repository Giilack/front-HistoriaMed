import * as React from "react"

/**
 * CAPTCHA de Cloudflare Turnstile. Se carga solo cuando el backend lo pide (tras 3 intentos fallidos con el mismo
 * usuario). La clave pública va en VITE_TURNSTILE_SITE_KEY; la secreta solo la tiene el backend.
 */
export const SITE_KEY_TURNSTILE = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  string | undefined

interface Turnstile {
  render: (
    contenedor: HTMLElement,
    opciones: {
      sitekey: string
      language?: string
      theme?: "auto" | "light" | "dark"
      callback: (token: string) => void
      "expired-callback": () => void
      "error-callback": () => void
    }
  ) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const URL_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let cargaScript: Promise<Turnstile> | null = null

function cargarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  cargaScript ??= new Promise<Turnstile>((resolver, rechazar) => {
    const script = document.createElement("script")
    script.src = URL_SCRIPT
    script.async = true
    script.onload = () =>
      window.turnstile
        ? resolver(window.turnstile)
        : rechazar(new Error("Turnstile no se inicializó"))
    script.onerror = () => {
      cargaScript = null
      rechazar(new Error("No se pudo cargar el CAPTCHA"))
    }
    document.head.appendChild(script)
  })
  return cargaScript
}

/**
 * Muestra el CAPTCHA y entrega el token cuando la persona lo resuelve (null si caduca). Cambiar `version` lo
 * reinicia: cada token sirve una sola vez.
 */
export function CaptchaTurnstile({
  version,
  alResolver,
}: {
  version: number
  alResolver: (token: string | null) => void
}) {
  const contenedor = React.useRef<HTMLDivElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const alResolverRef = React.useRef(alResolver)
  React.useEffect(() => {
    alResolverRef.current = alResolver
  })

  React.useEffect(() => {
    if (!SITE_KEY_TURNSTILE) return
    let id: string | null = null
    let activo = true
    cargarTurnstile()
      .then((turnstile) => {
        if (!activo || !contenedor.current) return
        id = turnstile.render(contenedor.current, {
          sitekey: SITE_KEY_TURNSTILE as string,
          language: "es",
          theme: "auto",
          callback: (token) => alResolverRef.current(token),
          "expired-callback": () => alResolverRef.current(null),
          "error-callback": () => alResolverRef.current(null),
        })
      })
      .catch((e: Error) => activo && setError(e.message))
    return () => {
      activo = false
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [version])

  if (!SITE_KEY_TURNSTILE) {
    return (
      <p className="text-sm text-destructive">
        El CAPTCHA no está configurado en este sitio. Contacte al administrador.
      </p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  return <div ref={contenedor} className="min-h-[65px]" />
}
