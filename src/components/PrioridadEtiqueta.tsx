import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"

import { NOMBRE_PRIORIDAD, type Alerta, type Prioridad } from "@/lib/types"
import { cn } from "@/lib/utils"

const ESTILOS: Record<Prioridad, { etiqueta: string; punto: string }> = {
  NORMAL: {
    etiqueta:
      "bg-marca-claro text-marca-oscuro dark:bg-muted dark:text-foreground",
    punto: "bg-marca",
  },
  PREFERENTE: {
    etiqueta: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    punto: "bg-amber-500",
  },
  URGENTE: {
    etiqueta: "bg-destructive/12 text-destructive",
    punto: "bg-destructive",
  },
}

/** Prioridad de atención como etiqueta con punto de color (rojo urgente, ámbar preferente, azul normal). */
export function PrioridadEtiqueta({ prioridad }: { prioridad: Prioridad }) {
  const e = ESTILOS[prioridad]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        e.etiqueta
      )}
    >
      <span className={cn("size-1.5 rounded-full", e.punto)} aria-hidden />
      {NOMBRE_PRIORIDAD[prioridad]}
    </span>
  )
}

/** Lista de alertas de signos vitales: las críticas en rojo, las advertencias en ámbar, siempre con icono. */
export function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
        <CircleCheck className="size-4" aria-hidden />
        Sin alertas en los signos vitales
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {alertas.map((a) => {
        const critica = a.severidad === "CRITICA"
        const Icono = critica ? TriangleAlert : CircleAlert
        return (
          <li
            key={a.codigo}
            className={cn(
              "flex items-start gap-2 rounded-lg px-2.5 py-1.5",
              critica
                ? "bg-destructive/10 font-medium text-destructive"
                : "bg-amber-500/10 text-amber-800 dark:text-amber-400"
            )}
          >
            <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {critica && <span className="sr-only">Crítica: </span>}
              {a.mensaje}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
