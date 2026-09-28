import * as React from "react"
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { AuthLayout } from "@/components/AuthLayout"
import { Alerta, Input } from "@/components/form"
import { Button } from "@/components/ui/button"

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [verPassword, setVerPassword] = React.useState(false)
  const [mayusculas, setMayusculas] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión")
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

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full"
          disabled={enviando}
        >
          <LogIn aria-hidden />
          {enviando ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </AuthLayout>
  )
}
