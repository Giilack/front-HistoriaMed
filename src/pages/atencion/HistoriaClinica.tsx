import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card>
      <CardHeader>
        <CardTitle>Historia clínica</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!atenciones && !error && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}
        {atenciones?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay atenciones anteriores registradas.
          </p>
        )}
        {atenciones?.map((a, i) => (
          <details key={a.id} open={i === 0} className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {formatoFecha.format(new Date(a.inicioEn))} ·{" "}
              {a.diagnosticos.find((d) => d.principal)?.descripcion ??
                a.motivoConsulta}
              {a.estado === "EN_CURSO" && (
                <span className="text-amber-600"> (en curso)</span>
              )}
            </summary>
            <div className="pt-3">
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
        ))}
      </CardContent>
    </Card>
  )
}
