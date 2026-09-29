import type * as React from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Título de la página, descripción opcional y acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  alVolver,
  textoVolver = "Volver",
}: {
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  alVolver?: () => void
  textoVolver?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      {alVolver && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 self-start text-muted-foreground"
          onClick={alVolver}
        >
          <ArrowLeft />
          {textoVolver}
        </Button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-marca-oscuro dark:text-foreground">
            {titulo}
          </h1>
          {descripcion && (
            <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
        {acciones && (
          <div className="flex flex-wrap items-center gap-2">{acciones}</div>
        )}
      </div>
    </div>
  )
}

/** Mensaje de lista vacía con icono y, opcionalmente, una acción. */
export function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  children,
  className,
}: {
  icono: LucideIcon
  titulo: string
  descripcion?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 py-10 text-center",
        className
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-marca-claro text-marca">
        <Icono className="size-6" aria-hidden />
      </span>
      <p className="font-medium">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

/** Paginación: "Página 2 de 5 · 73 pacientes" con anterior/siguiente. */
export function Paginacion({
  pagina,
  totalPaginas,
  totalElementos,
  unidad,
  alCambiar,
}: {
  pagina: number
  totalPaginas: number
  totalElementos: number
  unidad: string
  alCambiar: (pagina: number) => void
}) {
  if (totalPaginas <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        Página {pagina + 1} de {totalPaginas} · {totalElementos} {unidad}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={pagina === 0}
          onClick={() => alCambiar(pagina - 1)}
        >
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pagina + 1 >= totalPaginas}
          onClick={() => alCambiar(pagina + 1)}
        >
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

/** Tarjeta de una sección de formulario o de detalle, con icono de marca y título. */
export function SeccionTarjeta({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
  children,
}: {
  icono: LucideIcon
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  accion?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-marca-claro text-marca dark:bg-muted">
            <Icono className="size-4" aria-hidden />
          </span>
          {titulo}
        </CardTitle>
        {descripcion && <CardDescription>{descripcion}</CardDescription>}
        {accion && <CardAction>{accion}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}
