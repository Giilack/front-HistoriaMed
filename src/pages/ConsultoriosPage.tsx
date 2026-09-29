import * as React from "react"
import { DoorOpen, Pencil, Plus, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input } from "@/components/form"
import { EncabezadoPagina, EstadoVacio } from "@/components/pagina"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api, json } from "@/lib/api"
import type { Consultorio } from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"

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
      toast.success(`${c.nombre} ${c.activo ? "desactivado" : "activado"}`)
      recargar()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  const activos = consultorios?.filter((c) => c.activo).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Consultorios"
        descripcion={
          consultorios
            ? `${activos} activos de ${consultorios.length}. Se desactivan en lugar de borrarse: las citas pasadas los referencian.`
            : "Catálogo de consultorios del establecimiento."
        }
        acciones={
          <Button onClick={() => setEdicion("nuevo")}>
            <Plus />
            Nuevo consultorio
          </Button>
        }
      />

      {edicion && (
        <FormularioConsultorio
          key={edicion === "nuevo" ? "nuevo" : edicion.id}
          consultorio={edicion === "nuevo" ? null : edicion}
          alCancelar={() => setEdicion(null)}
          alGuardar={() => {
            toast.success(
              edicion === "nuevo"
                ? "Consultorio registrado"
                : "Consultorio actualizado"
            )
            setEdicion(null)
            recargar()
          }}
        />
      )}

      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}

      {consultorios?.length === 0 && (
        <Card>
          <EstadoVacio
            icono={DoorOpen}
            titulo="Aún no hay consultorios"
            descripcion="Registre el primero para poder programar citas."
          />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!consultorios &&
          [0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        {consultorios?.map((c) => (
          <Card
            key={c.id}
            className={cn(
              "gap-4 border-t-4 px-5",
              c.activo ? "border-t-marca" : "border-t-border opacity-70"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  c.activo
                    ? "bg-marca-claro text-marca dark:bg-muted"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <DoorOpen className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{c.nombre}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {c.especialidad}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  c.activo
                    ? "bg-green-600/12 text-green-700 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className="size-1.5 rounded-full bg-current"
                  aria-hidden
                />
                {c.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="flex gap-2 border-t pt-4">
              <Button size="sm" variant="outline" onClick={() => setEdicion(c)}>
                <Pencil />
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "ml-auto",
                  c.activo && "text-muted-foreground hover:text-destructive"
                )}
                onClick={() => cambiarEstado(c)}
              >
                {c.activo ? <PowerOff /> : <Power />}
                {c.activo ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </Card>
        ))}
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
    <Dialog open onOpenChange={(abierto) => !abierto && alCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {consultorio ? `Editar ${consultorio.nombre}` : "Nuevo consultorio"}
          </DialogTitle>
          <DialogDescription>
            Nombre visible en la agenda y la especialidad que atiende.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {error && <Alerta>{error}</Alerta>}
          <Campo label="Nombre">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              placeholder="ej. Consultorio 3"
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
