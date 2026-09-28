import { ListaAlertas, PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import type { Triaje } from "@/lib/types"

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

/** Signos vitales, alertas y prioridad de un triaje ya registrado. */
export function TriajeResumen({ triaje: t }: { triaje: Triaje }) {
  const signos: [string, string | null][] = [
    [
      "PA",
      t.presionSistolica
        ? `${t.presionSistolica}/${t.presionDiastolica} mmHg`
        : null,
    ],
    ["FC", `${t.frecuenciaCardiaca} lpm`],
    ["FR", t.frecuenciaRespiratoria ? `${t.frecuenciaRespiratoria} rpm` : null],
    ["T°", `${t.temperatura} °C`],
    ["SatO₂", `${t.saturacion} %`],
    ["Peso", `${t.peso} kg`],
    ["Talla", t.talla ? `${t.talla} cm` : null],
    ["IMC", t.imc ? String(t.imc) : null],
    ["P. abd.", t.perimetroAbdominal ? `${t.perimetroAbdominal} cm` : null],
  ]
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <PrioridadEtiqueta prioridad={t.prioridad} />
        {t.gestante && <span className="text-xs">Gestante</span>}
        {t.discapacidad && <span className="text-xs">Con discapacidad</span>}
        <span className="text-xs text-muted-foreground">
          {formatoFechaHora.format(new Date(t.fechaHora))} · {t.registradoPor}
        </span>
      </div>
      <p>
        <span className="text-muted-foreground">Motivo: </span>
        {t.motivoConsulta}
      </p>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-1 sm:grid-cols-5">
        {signos
          .filter(([, valor]) => valor !== null)
          .map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="font-medium">{valor}</dd>
            </div>
          ))}
      </dl>
      <ListaAlertas alertas={t.alertas} />
      {t.justificacionPrioridad && (
        <p className="text-xs">
          <span className="text-muted-foreground">
            Prioridad menor a la sugerida ({t.prioridadSugerida}):{" "}
          </span>
          {t.justificacionPrioridad}
        </p>
      )}
      {t.observaciones && (
        <p>
          <span className="text-muted-foreground">Observaciones: </span>
          {t.observaciones}
        </p>
      )}
    </div>
  )
}
