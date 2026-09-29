import * as React from "react"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api"

const REQUISITOS = "Mínimo 8 caracteres, con al menos una letra y un número."

/** Estado y envío del formulario, compartido por la pantalla obligatoria y la ventana emergente. */
function useCambioPassword(alTerminar: () => void) {
  const { cambiarPassword } = useAuth()
  const [actual, setActual] = React.useState("")
  const [nueva, setNueva] = React.useState("")
  const [confirmacion, setConfirmacion] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [errorNueva, setErrorNueva] = React.useState<string>()
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
      setActual("")
      setNueva("")
      setConfirmacion("")
      alTerminar()
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

  const campos = (
    <>
      {error && <Alerta>{error}</Alerta>}
      <Campo label="Contraseña actual">
        <Input
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          autoFocus
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
    </>
  )

  return { enviar, enviando, campos }
}

/** Contraseña temporal: pantalla completa con el diseño del login, porque es parte del acceso. */
export function CambiarPasswordPage() {
  const { logout } = useAuth()
  // Al cambiarla, el backend actualiza el usuario y la app sigue a la pantalla principal
  const { enviar, enviando, campos } = useCambioPassword(() => undefined)

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Cambiar contraseña</CardTitle>
          <CardDescription>
            Está usando una contraseña temporal. Debe cambiarla para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            {campos}
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Cambiar contraseña"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

/** Cambio voluntario desde el menú del usuario: ventana emergente centrada. */
export function DialogoCambiarPassword({ alCerrar }: { alCerrar: () => void }) {
  const { enviar, enviando, campos } = useCambioPassword(() => {
    toast.success("Contraseña actualizada")
    alCerrar()
  })

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-marca-claro text-marca dark:bg-muted">
              <KeyRound className="size-4" aria-hidden />
            </span>
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription>{REQUISITOS}</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {campos}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={alCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
