import * as React from "react"
import { createPortal, flushSync } from "react-dom"
import {
  BedDouble,
  CalendarCheck,
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
import { fechaLocal, formatearFecha } from "@/lib/fechas"
import {
  NOMBRE_CATEGORIA_PLAN,
  NOMBRE_VIA,
  type Atencion,
  type ItemPlan,
} from "@/lib/types"

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

const formatoFechaLarga = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "long",
})

/** Qué documento se manda a imprimir: solo ese bloque queda en la página impresa. */
type Impresion = "receta" | "ordenes" | "descanso"

const GRUPOS_PLAN: { tipo: ItemPlan["tipo"]; titulo: string }[] = [
  { tipo: "TRATAMIENTO", titulo: "Tratamiento no farmacológico" },
  { tipo: "EXAMEN", titulo: "Exámenes solicitados" },
  { tipo: "INTERCONSULTA", titulo: "Interconsultas" },
]

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
  const [impresion, setImpresion] = React.useState<Impresion | null>(null)
  const firmada = a.estado === "CERRADA"
  const ordenes = a.plan.filter((i) => i.tipo !== "TRATAMIENTO")

  /** Muestra solo el documento pedido y abre el diálogo de impresión. */
  function imprimir(que: Impresion) {
    // El bloque debe estar en la página antes de imprimir: se fuerza el dibujado
    flushSync(() => setImpresion(que))
    window.print()
  }

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
                onClick={() => imprimir("receta")}
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
          {impresion === "receta" && <RecetaImprimible atencion={a} />}
        </div>
      )}

      {GRUPOS_PLAN.map(({ tipo, titulo }) => {
        const items = a.plan.filter((i) => i.tipo === tipo)
        if (items.length === 0) return null
        return (
          <div key={tipo} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
                {titulo}
              </h4>
              {/* Una sola orden impresa reúne exámenes e interconsultas */}
              {firmada && tipo === ordenes[0]?.tipo && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => imprimir("ordenes")}
                >
                  <Printer />
                  Imprimir órdenes
                </Button>
              )}
            </div>
            <ul className="flex flex-col gap-1.5">
              {items.map((i, n) => (
                <li key={n} className="flex flex-wrap items-baseline gap-x-2">
                  {i.categoria && (
                    <Badge variant="secondary">
                      {NOMBRE_CATEGORIA_PLAN[i.categoria]}
                    </Badge>
                  )}
                  <span className="font-medium">{i.descripcion}</span>
                  {i.detalle && (
                    <span className="text-muted-foreground">
                      {tipo === "INTERCONSULTA" ? "Motivo: " : ""}
                      {i.detalle}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {impresion === "ordenes" && <OrdenesImprimible atencion={a} />}

      {a.descanso && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <BedDouble className="size-4 shrink-0 text-marca" aria-hidden />
          <span className="min-w-0 flex-1">
            <b>Descanso médico: {dias(a.descanso.dias)}</b>, del{" "}
            {formatearFecha(a.descanso.desde)} al{" "}
            {formatearFecha(a.descanso.hasta)}
          </span>
          {firmada && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => imprimir("descanso")}
            >
              <Printer />
              Imprimir descanso
            </Button>
          )}
          {impresion === "descanso" && <DescansoImprimible atencion={a} />}
        </div>
      )}

      {a.control && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <CalendarCheck className="size-4 shrink-0 text-marca" aria-hidden />
          <span>
            <b>Control sugerido:</b> {formatearFecha(a.control.fecha)}
            {a.control.nota && (
              <span className="text-muted-foreground"> · {a.control.nota}</span>
            )}
          </span>
        </p>
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

function dias(n: number) {
  return n === 1 ? "1 día" : `${n} días`
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
    <Imprimible>
      <CabeceraImpresa titulo="Receta médica" atencion={a} />
      <ListaReceta atencion={a} />
      {a.plan.some((i) => i.tipo === "TRATAMIENTO") && (
        <div className="mt-3">
          <b>Otras indicaciones:</b>
          <ul className="list-disc pl-5">
            {a.plan
              .filter((i) => i.tipo === "TRATAMIENTO")
              .map((i, n) => (
                <li key={n}>
                  {i.descripcion}
                  {i.detalle && ` (${i.detalle})`}
                </li>
              ))}
          </ul>
        </div>
      )}
      {a.indicaciones && (
        <p className="mt-3">
          <b>Indicaciones:</b> {a.indicaciones}
        </p>
      )}
      {a.control && (
        <p className="mt-3">
          <b>Control:</b> {formatearFecha(a.control.fecha)}
        </p>
      )}
      <Firma atencion={a} />
    </Imprimible>
  )
}

/**
 * Documento para imprimir. Se dibuja directamente en <body>: al imprimir, la hoja de estilos oculta todo lo demás
 * (ver `.zona-impresion` en index.css), así el documento sale solo, desde el inicio de la hoja.
 */
function Imprimible({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="zona-impresion">{children}</div>,
    document.body
  )
}

/** Datos del paciente y fecha, comunes a los documentos impresos. */
function CabeceraImpresa({
  titulo,
  atencion: a,
}: {
  titulo: string
  atencion: Atencion
}) {
  return (
    <>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p>
        Paciente: <b>{a.paciente.nombreCompleto}</b> · {a.paciente.numeroHc} ·{" "}
        {a.paciente.edad}
      </p>
      <p>
        Fecha: {a.cerradaEn && formatoFechaHora.format(new Date(a.cerradaEn))} ·
        Diagnóstico: {a.diagnosticos.find((d) => d.principal)?.codigo}
      </p>
      <hr className="my-3" />
    </>
  )
}

function Firma({ atencion: a }: { atencion: Atencion }) {
  return (
    <div className="mt-16 text-center">
      <p>_______________________________</p>
      <p>{a.medico.nombreCompleto}</p>
      {a.medico.cmp && <p>CMP {a.medico.cmp}</p>}
    </div>
  )
}

/** Orden de exámenes auxiliares e interconsultas. Solo visible al imprimir. */
function OrdenesImprimible({ atencion: a }: { atencion: Atencion }) {
  const examenes = a.plan.filter((i) => i.tipo === "EXAMEN")
  const interconsultas = a.plan.filter((i) => i.tipo === "INTERCONSULTA")
  return (
    <Imprimible>
      <CabeceraImpresa
        titulo="Orden de exámenes e interconsultas"
        atencion={a}
      />
      {examenes.length > 0 && (
        <>
          <b>Exámenes solicitados</b>
          <ol className="mb-3 list-decimal pl-5">
            {examenes.map((i, n) => (
              <li key={n}>
                {i.descripcion}
                {i.categoria && i.categoria !== "OTRO"
                  ? ` (${NOMBRE_CATEGORIA_PLAN[i.categoria].toLowerCase()})`
                  : ""}
                {i.detalle && `. ${i.detalle}`}
              </li>
            ))}
          </ol>
        </>
      )}
      {interconsultas.length > 0 && (
        <>
          <b>Interconsultas</b>
          <ol className="list-decimal pl-5">
            {interconsultas.map((i, n) => (
              <li key={n}>
                {i.descripcion}. Motivo: {i.detalle}
              </li>
            ))}
          </ol>
        </>
      )}
      <Firma atencion={a} />
    </Imprimible>
  )
}

/** Certificado de descanso médico. Solo visible al imprimir. */
function DescansoImprimible({ atencion: a }: { atencion: Atencion }) {
  if (!a.descanso) return null
  return (
    <Imprimible>
      <CabeceraImpresa titulo="Certificado de descanso médico" atencion={a} />
      <p className="leading-relaxed">
        Se indica descanso médico por <b>{dias(a.descanso.dias)}</b>, del{" "}
        <b>{formatoFechaLarga.format(fechaLocal(a.descanso.desde))}</b> al{" "}
        <b>{formatoFechaLarga.format(fechaLocal(a.descanso.hasta))}</b>, ambos
        días incluidos.
      </p>
      <Firma atencion={a} />
    </Imprimible>
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
