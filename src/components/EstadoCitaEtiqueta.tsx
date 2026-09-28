import { NOMBRE_ESTADO_CITA, type EstadoCita } from "@/lib/types"

const ESTILOS: Record<EstadoCita, string> = {
  PROGRAMADA: "bg-muted text-foreground",
  EN_ESPERA_TRIAJE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  EN_ESPERA_CONSULTA: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  EN_CONSULTA: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  ATENDIDO: "bg-green-600/15 text-green-700 dark:text-green-400",
  CANCELADA: "bg-muted text-muted-foreground line-through",
  NO_SE_PRESENTO: "bg-destructive/10 text-destructive",
}

export function EstadoCitaEtiqueta({ estado }: { estado: EstadoCita }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${ESTILOS[estado]}`}
    >
      {NOMBRE_ESTADO_CITA[estado]}
    </span>
  )
}
