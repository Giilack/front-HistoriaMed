import { NOMBRE_PRIORIDAD, type Alerta, type Prioridad } from "@/lib/types"

const ESTILOS: Record<Prioridad, string> = {
  NORMAL: "bg-muted text-foreground",
  PREFERENTE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  URGENTE: "bg-destructive/15 text-destructive",
}

export function PrioridadEtiqueta({ prioridad }: { prioridad: Prioridad }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${ESTILOS[prioridad]}`}
    >
      {NOMBRE_PRIORIDAD[prioridad]}
    </span>
  )
}

/** Lista de alertas de signos vitales: las críticas en rojo, las advertencias en ámbar. */
export function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin alertas en los signos vitales.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {alertas.map((a) => (
        <li
          key={a.codigo}
          className={
            a.severidad === "CRITICA"
              ? "rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive"
              : "rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-400"
          }
        >
          {a.severidad === "CRITICA" ? "⚠ " : ""}
          {a.mensaje}
        </li>
      ))}
    </ul>
  )
}
