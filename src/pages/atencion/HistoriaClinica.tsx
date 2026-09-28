import { ChevronRight, History } from "lucide-react"

import { Alerta } from "@/components/form"
import { EstadoVacio, SeccionTarjeta } from "@/components/pagina"
import { Skeleton } from "@/components/ui/skeleton"
import type { Atencion } from "@/lib/types"
import { useApi } from "@/lib/useApi"

import { AtencionDetalle } from "./AtencionDetalle"

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" })

/**
 * Historia clínica (solo MEDICO): atenciones del paciente, la más reciente abierta.
 * @param excluirId atención que no se muestra (la que se está atendiendo ahora)
 */
export function HistoriaClinica({
  pacienteId,
  excluirId,
}: {
  pacienteId: number
  excluirId?: number
}) {
  const { datos, error, setDatos } = useApi<Atencion[]>(
    `/api/pacientes/${pacienteId}/atenciones`
  )
  const atenciones = datos?.filter((a) => a.id !== excluirId)

  return (
    <SeccionTarjeta icono={History} titulo="Historia clínica">
      {error && <Alerta>{error}</Alerta>}
      {!atenciones && !error && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
      {atenciones?.length === 0 && (
        <EstadoVacio
          icono={History}
          titulo="Sin atenciones anteriores"
          descripcion="Aún no hay otras atenciones registradas para este paciente."
          className="py-6"
        />
      )}
      {atenciones && atenciones.length > 0 && (
        <ol className="relative flex flex-col gap-3 border-l-2 border-marca-claro pl-4 dark:border-border">
          {atenciones.map((a, i) => (
            <li key={a.id} className="relative">
              <span
                className="absolute top-3.5 -left-[23px] size-3 rounded-full border-2 border-card bg-marca"
                aria-hidden
              />
              <details
                open={i === 0}
                className="group rounded-lg border bg-card open:shadow-xs"
              >
                <summary className="flex cursor-pointer list-none items-start gap-2 p-3 text-sm [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-open:rotate-90"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">
                      {formatoFecha.format(new Date(a.inicioEn))} ·{" "}
                      {a.medico.nombreCompleto}
                    </span>
                    <span className="font-medium">
                      {a.diagnosticos.find((d) => d.principal)?.descripcion ??
                        a.motivoConsulta}
                    </span>
                  </span>
                  {a.estado === "EN_CURSO" && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-400">
                      En curso
                    </span>
                  )}
                </summary>
                <div className="border-t p-3">
                  <AtencionDetalle
                    atencion={a}
                    alActualizar={(actualizada) =>
                      setDatos(
                        (lista) =>
                          lista?.map((x) =>
                            x.id === actualizada.id ? actualizada : x
                          ) ?? null
                      )
                    }
                  />
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </SeccionTarjeta>
  )
}
