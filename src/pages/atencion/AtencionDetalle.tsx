import * as React from "react"
import {
  MessageSquarePlus,
  Pill,
  Printer,
  Signature,
  TriangleAlert,
} from "lucide-react"

import { Alerta, Textarea } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError, api, json } from "@/lib/api"
import { NOMBRE_VIA, type Atencion } from "@/lib/types"

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

/**
 * Atención en modo lectura: contenido, diagnósticos, receta y adendas. Una atención cerrada no se edita;
 * las correcciones se agregan como adendas (plan.md, principio P3).
 */
export function AtencionDetalle({
  atencion: a,
  alActualizar,
}: {
  atencion: Atencion
  alActualizar?: (a: Atencion) => void
}) {
  const secciones: [string, string | null][] = [
    [
      "Motivo de consulta",
      a.motivoConsulta +
        (a.tiempoEnfermedad
          ? ` (tiempo de enfermedad: ${a.tiempoEnfermedad})`
          : ""),
    ],
    ["Anamnesis", a.anamnesis],
    ["Examen físico", a.examenFisico],
    ["Plan de trabajo", a.planTrabajo],
    ["Indicaciones", a.indicaciones],
  ]
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {a.cerradaEn && (
          <Signature className="size-3.5 text-green-600" aria-hidden />
        )}
        {a.medico.nombreCompleto}
        {a.medico.cmp && ` · CMP ${a.medico.cmp}`} ·{" "}
        {formatoFechaHora.format(new Date(a.inicioEn))}
        {a.cerradaEn
          ? ` · Firmada ${formatoFechaHora.format(new Date(a.cerradaEn))}`
          : " · En curso"}
      </p>

      {secciones
        .filter(([, texto]) => texto)
        .map(([titulo, texto]) => (
          <div key={titulo}>
            <h4 className="mb-0.5 text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
              {titulo}
            </h4>
            <p className="whitespace-pre-line">{texto}</p>
          </div>
        ))}

      <div>
        <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
          Diagnósticos
        </h4>
        <ul className="flex flex-col gap-1.5">
          {a.diagnosticos.map((d) => (
            <li key={d.codigo} className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {d.codigo}
              </Badge>
              <span className="min-w-0 flex-1">{d.descripcion}</span>
              <span className="text-xs text-muted-foreground">
                {d.tipo === "PRESUNTIVO" ? "Presuntivo" : "Definitivo"}
              </span>
              {d.principal && <Badge variant="secondary">Principal</Badge>}
            </li>
          ))}
        </ul>
      </div>

      {a.receta.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
              Receta
            </h4>
            {a.estado === "CERRADA" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer />
                Imprimir receta
              </Button>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {a.receta.map((r) => (
              <li
                key={r.medicamentoId}
                className="flex gap-2.5 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <Pill
                  className="mt-0.5 size-4 shrink-0 text-marca"
                  aria-hidden
                />
                <div className="min-w-0">
                  <b>{r.medicamento}</b>
                  <p className="text-muted-foreground">
                    {r.dosis}, vía {NOMBRE_VIA[r.via].toLowerCase()},{" "}
                    {r.frecuencia}, por {r.duracion} · Cantidad: {r.cantidad}
                  </p>
                  {r.indicaciones && (
                    <p className="text-xs">{r.indicaciones}</p>
                  )}
                  {r.alergiaConfirmada && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                      <TriangleAlert
                        className="mt-px size-3.5 shrink-0"
                        aria-hidden
                      />
                      Recetado pese a alerta de alergia. Justificación:{" "}
                      {r.justificacionAlergia}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <RecetaImprimible atencion={a} />
        </div>
      )}

      {(a.adendas.length > 0 || (a.estado === "CERRADA" && alActualizar)) && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <h4 className="text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
            Adendas
          </h4>
          {a.adendas.map((ad) => (
            <div
              key={ad.id}
              className="rounded-lg border-l-4 border-l-marca-acento bg-marca-claro/50 px-3 py-2 dark:bg-muted/50"
            >
              <p className="text-xs text-muted-foreground">
                {ad.autor} · {formatoFechaHora.format(new Date(ad.creadoEn))}
              </p>
              <p className="whitespace-pre-line">{ad.texto}</p>
            </div>
          ))}
          {a.estado === "CERRADA" && alActualizar && (
            <FormularioAdenda atencionId={a.id} alGuardar={alActualizar} />
          )}
        </div>
      )}
    </div>
  )
}

/** Receta en texto corrido para la versión impresa. */
function ListaReceta({ atencion }: { atencion: Atencion }) {
  return (
    <ol className="list-decimal pl-5">
      {atencion.receta.map((r) => (
        <li key={r.medicamentoId} className="mb-1">
          <b>{r.medicamento}</b> — {r.dosis}, vía{" "}
          {NOMBRE_VIA[r.via].toLowerCase()}, {r.frecuencia}, por {r.duracion}.
          Cantidad: {r.cantidad}.{r.indicaciones && ` ${r.indicaciones}.`}
          {r.alergiaConfirmada && (
            <span className="block text-xs text-destructive">
              Recetado pese a alerta de alergia. Justificación:{" "}
              {r.justificacionAlergia}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Solo visible al imprimir (ver `.zona-impresion` en index.css). */
function RecetaImprimible({ atencion: a }: { atencion: Atencion }) {
  return (
    <div className="zona-impresion hidden print:block">
      <h2 className="text-xl font-bold">Receta médica</h2>
      <p>
        Paciente: <b>{a.paciente.nombreCompleto}</b> · {a.paciente.numeroHc} ·{" "}
        {a.paciente.edad}
      </p>
      <p>
        Fecha: {a.cerradaEn && formatoFechaHora.format(new Date(a.cerradaEn))} ·
        Diagnóstico: {a.diagnosticos.find((d) => d.principal)?.codigo}
      </p>
      <hr className="my-3" />
      <ListaReceta atencion={a} />
      {a.indicaciones && (
        <p className="mt-3">
          <b>Indicaciones:</b> {a.indicaciones}
        </p>
      )}
      <div className="mt-16 text-center">
        <p>_______________________________</p>
        <p>{a.medico.nombreCompleto}</p>
        {a.medico.cmp && <p>CMP {a.medico.cmp}</p>}
      </div>
    </div>
  )
}

function FormularioAdenda({
  atencionId,
  alGuardar,
}: {
  atencionId: number
  alGuardar: (a: Atencion) => void
}) {
  const [abierto, setAbierto] = React.useState(false)
  const [texto, setTexto] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  if (!abierto) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => setAbierto(true)}
      >
        <MessageSquarePlus />
        Agregar adenda
      </Button>
    )
  }

  async function guardar() {
    if (!texto.trim()) return
    setEnviando(true)
    setError(null)
    try {
      alGuardar(
        await api<Atencion>(`/api/atenciones/${atencionId}/adendas`, {
          method: "POST",
          ...json({ texto }),
        })
      )
      setTexto("")
      setAbierto(false)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo agregar la adenda"
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      {error && <Alerta>{error}</Alerta>}
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={2000}
        placeholder="Corrección o aclaración (por ejemplo, un resultado de laboratorio). La atención original no se modifica."
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={enviando || !texto.trim()}
          onClick={guardar}
        >
          {enviando ? "Guardando…" : "Guardar adenda"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
