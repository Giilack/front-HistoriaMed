import * as React from "react"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api, json } from "@/lib/api"
import type { Consultorio } from "@/lib/types"
import { useApi } from "@/lib/useApi"

/** Catálogo de consultorios (ADMIN). Se desactivan en lugar de borrarse: las citas pasadas los referencian. */
export function ConsultoriosPage() {
  const {
    datos: consultorios,
    error: errorCarga,
    recargar,
  } = useApi<Consultorio[]>("/api/consultorios?soloActivos=false")
  const [edicion, setEdicion] = React.useState<null | "nuevo" | Consultorio>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)
  const { confirmar } = useConfirmacion()

  async function cambiarEstado(c: Consultorio) {
    const accion = c.activo ? "desactivar" : "activar"
    if (
      c.activo &&
      !(await confirmar({
        titulo: `¿Desactivar ${c.nombre}?`,
        descripcion:
          "No se podrán programar citas en él. Las citas pasadas se conservan.",
        accion: "Desactivar",
        destructivo: true,
      }))
    )
      return
    setError(null)
    try {
      await api(`/api/consultorios/${c.id}/${accion}`, { method: "PATCH" })
      recargar()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Consultorios</h1>
        <Button onClick={() => setEdicion("nuevo")}>Nuevo consultorio</Button>
      </div>

      {edicion && (
        <FormularioConsultorio
          key={edicion === "nuevo" ? "nuevo" : edicion.id}
          consultorio={edicion === "nuevo" ? null : edicion}
          alCancelar={() => setEdicion(null)}
          alGuardar={() => {
            setEdicion(null)
            recargar()
          }}
        />
      )}

      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Especialidad</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consultorios?.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-medium">{c.nombre}</td>
                <td className="px-3 py-2">{c.especialidad}</td>
                <td className="px-3 py-2">
                  {c.activo ? (
                    <span className="text-green-700 dark:text-green-400">
                      Activo
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Inactivo</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setEdicion(c)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      variant={c.activo ? "destructive" : "secondary"}
                      onClick={() => cambiarEstado(c)}
                    >
                      {c.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormularioConsultorio({
  consultorio,
  alGuardar,
  alCancelar,
}: {
  consultorio: Consultorio | null
  alGuardar: () => void
  alCancelar: () => void
}) {
  const [nombre, setNombre] = React.useState(consultorio?.nombre ?? "")
  const [especialidad, setEspecialidad] = React.useState(
    consultorio?.especialidad ?? ""
  )
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await api(
        consultorio
          ? `/api/consultorios/${consultorio.id}`
          : "/api/consultorios",
        {
          method: consultorio ? "PUT" : "POST",
          ...json({ nombre, especialidad }),
        }
      )
      alGuardar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {consultorio ? `Editar ${consultorio.nombre}` : "Nuevo consultorio"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {error && <Alerta>{error}</Alerta>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={60}
                required
              />
            </Campo>
            <Campo label="Especialidad">
              <Input
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                maxLength={60}
                placeholder="ej. Medicina General"
                required
              />
            </Campo>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
