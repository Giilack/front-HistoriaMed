import * as React from "react"
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { AuthLayout } from "@/components/AuthLayout"
import { CaptchaTurnstile } from "@/components/CaptchaTurnstile"
import { ApiError, servidorDisponible } from "@/lib/api"
import { Alerta, Input } from "@/components/form"
import { Button } from "@/components/ui/button"

/** Si el servidor no responde en este tiempo, se muestra el aviso de que está iniciando. */
const AVISO_MS = 2500
/** Espera máxima de cada consulta a /api/salud y pausa entre consultas mientras el servidor arranca. */
const INTENTO_MS = 20000
const PAUSA_MS = 3000

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [verPassword, setVerPassword] = React.useState(false)
  const [mayusculas, setMayusculas] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)
  // Tras 3 intentos fallidos con el mismo usuario, el backend exige el CAPTCHA (CAPTCHA_REQUERIDO)
  const [pideCaptcha, setPideCaptcha] = React.useState(false)
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const [versionCaptcha, setVersionCaptcha] = React.useState(0)
  // El backend gratuito se duerme tras 15 min sin uso. Al abrir el login se le despierta mientras el usuario
  // escribe; si no responde en AVISO_MS se avisa que está iniciando (visibilidad del estado del sistema).
  const [servidor, setServidor] = React.useState<
    "comprobando" | "iniciando" | "listo"
  >("comprobando")

  React.useEffect(() => {
    let vigente = true
    const aviso = setTimeout(() => {
      if (vigente) setServidor((s) => (s === "comprobando" ? "iniciando" : s))
    }, AVISO_MS)
    // Un arranque en frío puede pasar de 2 min y Vercel corta cada espera a los 120 s (502): se reintenta
    // con esperas cortas hasta que el servidor responda, para que el aviso desaparezca en cuanto esté listo.
    ;(async () => {
      while (vigente) {
        if (await servidorDisponible(INTENTO_MS)) {
          if (vigente) setServidor("listo")
          return
        }
        await new Promise((r) => setTimeout(r, PAUSA_MS))
      }
    })()
    return () => {
      vigente = false
      clearTimeout(aviso)
    }
  }, [])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(username.trim(), password, pideCaptcha ? captchaToken : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión")
      if (err instanceof ApiError && err.codigo === "CAPTCHA_REQUERIDO") {
        setPideCaptcha(true)
      }
      // Cada token sirve una sola vez: se pide uno nuevo para el siguiente intento
      setCaptchaToken(null)
      setVersionCaptcha((v) => v + 1)
    } finally {
      setEnviando(false)
    }
  }

  // Aviso de Bloq Mayús: causa frecuente de contraseñas "incorrectas" (y de bloqueos tras 5 intentos)
  const revisarMayusculas = (e: React.KeyboardEvent) =>
    setMayusculas(e.getModifierState("CapsLock"))

  return (
    <AuthLayout>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Iniciar sesión
        </h2>
        <p className="text-sm text-muted-foreground">
          Ingrese con el usuario asignado por su establecimiento.
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <p
          role="status"
          className={
            servidor === "iniciando"
              ? "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
              : "sr-only"
          }
        >
          {servidor === "iniciando"
            ? "El servidor se está iniciando. Puede escribir sus datos; el primer ingreso puede demorar unos minutos; este aviso desaparecerá cuando esté listo."
            : servidor === "listo"
              ? "Servidor disponible."
              : ""}
        </p>
        {error && <Alerta>{error}</Alerta>}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Usuario</span>
          <span className="relative">
            <UserRound
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="h-10 bg-card pl-9"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ej. mlopez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Contraseña</span>
          <span className="relative">
            <LockKeyhole
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="h-10 bg-card pr-10 pl-9"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={revisarMayusculas}
              onKeyDown={revisarMayusculas}
              required
            />
            <button
              type="button"
              className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={
                verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              aria-pressed={verPassword}
            >
              {verPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </span>
          {mayusculas && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Bloq Mayús está activado.
            </span>
          )}
        </label>

        {pideCaptcha && (
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Verificación de seguridad</span>
            <CaptchaTurnstile
              version={versionCaptcha}
              alResolver={setCaptchaToken}
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full"
          disabled={enviando || (pideCaptcha && !captchaToken)}
        >
          <LogIn aria-hidden />
          {enviando
            ? servidor === "listo"
              ? "Ingresando…"
              : "Conectando con el servidor…"
            : "Ingresar"}
        </Button>
      </form>
    </AuthLayout>
  )
}
