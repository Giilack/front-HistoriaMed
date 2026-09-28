import {
  Accessibility,
  Baby,
  Calculator,
  Droplets,
  Gauge,
  HeartPulse,
  Ruler,
  Thermometer,
  Weight,
  Wind,
  type LucideIcon,
} from "lucide-react"

import { ListaAlertas, PrioridadEtiqueta } from "@/components/PrioridadEtiqueta"
import type { Triaje } from "@/lib/types"

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

/** Signos vitales, alertas y prioridad de un triaje ya registrado. */
export function TriajeResumen({ triaje: t }: { triaje: Triaje }) {
  const signos: [LucideIcon, string, string | null][] = [
    [
      Gauge,
      "Presión",
      t.presionSistolica
        ? `${t.presionSistolica}/${t.presionDiastolica} mmHg`
        : null,
    ],
    [HeartPulse, "Frec. cardiaca", `${t.frecuenciaCardiaca} lpm`],
    [
      Wind,
      "Frec. respiratoria",
      t.frecuenciaRespiratoria ? `${t.frecuenciaRespiratoria} rpm` : null,
    ],
    [Thermometer, "Temperatura", `${t.temperatura} °C`],
    [Droplets, "Saturación O₂", `${t.saturacion} %`],
    [Weight, "Peso", `${t.peso} kg`],
    [Ruler, "Talla", t.talla ? `${t.talla} cm` : null],
    [Calculator, "IMC", t.imc ? String(t.imc) : null],
    [
      Ruler,
      "Perím. abdominal",
      t.perimetroAbdominal ? `${t.perimetroAbdominal} cm` : null,
    ],
  ]
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <PrioridadEtiqueta prioridad={t.prioridad} />
        {t.gestante && (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Baby className="size-3.5" aria-hidden />
            Gestante
          </span>
        )}
        {t.discapacidad && (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Accessibility className="size-3.5" aria-hidden />
            Con discapacidad
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatoFechaHora.format(new Date(t.fechaHora))} · {t.registradoPor}
        </span>
      </div>

      <p>
        <span className="text-muted-foreground">Motivo: </span>
        {t.motivoConsulta}
      </p>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {signos
          .filter(([, , valor]) => valor !== null)
          .map(([Icono, etiqueta, valor]) => (
            <div
              key={etiqueta}
              className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2"
            >
              <Icono className="size-4 shrink-0 text-marca" aria-hidden />
              <div className="min-w-0">
                <dt className="truncate text-[11px] text-muted-foreground">
                  {etiqueta}
                </dt>
                <dd className="font-semibold tabular-nums">{valor}</dd>
              </div>
            </div>
          ))}
      </dl>

      <ListaAlertas alertas={t.alertas} />

      {t.justificacionPrioridad && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
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
