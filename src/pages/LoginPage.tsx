import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { Alerta, Campo, Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
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

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">HistoriaMed</CardTitle>
          <CardDescription>
            Ingrese con su usuario del establecimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            {error && <Alerta>{error}</Alerta>}
            <Campo label="Usuario">
              <Input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Campo>
            <Campo label="Contraseña">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Campo>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
