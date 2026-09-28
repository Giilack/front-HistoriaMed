import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { AuthLayout } from "@/components/AuthLayout"
import { Alerta, Campo, Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api"

/**
 * Se usa en dos casos: obligatoria (contraseña temporal) o voluntaria desde el menú.
 */
export function CambiarPasswordPage({
  obligatorio,
  alTerminar,
}: {
  obligatorio: boolean
  alTerminar?: () => void
}) {
  const { cambiarPassword, logout } = useAuth()
  const [actual, setActual] = React.useState("")
  const [nueva, setNueva] = React.useState("")
  const [confirmacion, setConfirmacion] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [errorNueva, setErrorNueva] = React.useState<string>()
  const [exito, setExito] = React.useState(false)
  const [enviando, setEnviando] = React.useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setErrorNueva(undefined)
    if (nueva !== confirmacion) {
      setError("La confirmación no coincide con la nueva contraseña")
      return
    }
    setEnviando(true)
    try {
      await cambiarPassword(actual, nueva)
      setExito(true)
      setActual("")
      setNueva("")
      setConfirmacion("")
      alTerminar?.()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrorNueva(err.errores.passwordNueva)
      } else {
        setError("No se pudo cambiar la contraseña")
      }
    } finally {
      setEnviando(false)
    }
  }

  const formulario = (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Cambiar contraseña</CardTitle>
        <CardDescription>
          {obligatorio
            ? "Está usando una contraseña temporal. Debe cambiarla para continuar."
            : "Mínimo 8 caracteres, con al menos una letra y un número."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {error && <Alerta>{error}</Alerta>}
          {exito && !obligatorio && (
            <Alerta tipo="exito">Contraseña actualizada.</Alerta>
          )}
          <Campo label="Contraseña actual">
            <Input
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
            />
          </Campo>
          <Campo label="Nueva contraseña" error={errorNueva}>
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
          </Campo>
          <Campo label="Confirmar nueva contraseña">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
            />
          </Campo>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Cambiar contraseña"}
          </Button>
          {obligatorio && (
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )

  if (!obligatorio) return formulario
  // Contraseña temporal: mismo diseño que el login, porque es parte del acceso
  return <AuthLayout>{formulario}</AuthLayout>
}
