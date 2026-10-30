import * as React from "react"
import { Bot, Eraser, FileText, Send, TriangleAlert } from "lucide-react"

import { Alerta } from "@/components/form"
import { EstadoVacio } from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, api, json } from "@/lib/api"
import { useApi } from "@/lib/useApi"
import { cn } from "@/lib/utils"

/** Respuesta del backend (POST /api/pacientes/{id}/asistente). */
type RespuestaAsistente = {
  respuesta: string
  fuentes: { id: string; etiqueta: string }[]
  sugerencia: boolean
  advertencias: string[]
  modelo: string
}

type Mensaje =
  | { autor: "MEDICO"; texto: string }
  | ({ autor: "ASISTENTE"; texto: string } & Omit<
      RespuestaAsistente,
      "respuesta"
    >)

const PREGUNTAS_SUGERIDAS = [
  "¿Tiene alergias?",
  "¿Qué medicamentos se le recetaron antes?",
  "¿Qué diagnósticos previos tiene?",
  "Resume sus últimas 3 atenciones",
]

const MAXIMO_PREGUNTA = 500

const FUENTES_VISIBLES = 4

/**
 * Asistente clínico (HU010): el médico pregunta en lenguaje natural sobre la historia del paciente abierto. Responde
 * citando la fuente; si el dato no está, dice que no hay registro. La conversación vive solo en esta pantalla: no se
 * guarda en el servidor ni en la historia clínica.
 *
 * @param compacto para columnas angostas (la pantalla de atención): encabezado breve y menos alto
 */
export function AsistenteClinico({
  pacienteId,
  compacto = false,
}: {
  pacienteId: number
  compacto?: boolean
}) {
  const { datos: estadoIa, error: errorEstado } = useApi<{
    disponible: boolean
    modelo: string | null
  }>("/api/ia/estado")
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [pregunta, setPregunta] = React.useState("")
  const [enviando, setEnviando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const final = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    final.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [mensajes, enviando])

  const preguntar = async (texto: string) => {
    const limpia = texto.trim()
    if (!limpia || enviando) return
    setError(null)
    setEnviando(true)
    // Los últimos turnos dan contexto a preguntas como «¿y por cuántos días?»
    const historial = mensajes
      .slice(-6)
      .map((m) => ({ autor: m.autor, texto: m.texto.slice(0, 2000) }))
    setMensajes((actuales) => [...actuales, { autor: "MEDICO", texto: limpia }])
    setPregunta("")
    try {
      const r = await api<RespuestaAsistente>(
        `/api/pacientes/${pacienteId}/asistente`,
        { method: "POST", ...json({ pregunta: limpia, historial }) }
      )
      setMensajes((actuales) => [
        ...actuales,
        {
          autor: "ASISTENTE",
          texto: r.respuesta,
          fuentes: r.fuentes,
          sugerencia: r.sugerencia,
          advertencias: r.advertencias,
          modelo: r.modelo,
        },
      ])
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo consultar al asistente. Intente de nuevo."
      )
      // La pregunta vuelve al cuadro para reintentar sin escribirla otra vez
      setMensajes((actuales) => actuales.slice(0, -1))
      setPregunta(limpia)
    } finally {
      setEnviando(false)
    }
  }

  if (errorEstado) return <Alerta>{errorEstado}</Alerta>
  if (!estadoIa) return <Skeleton className="h-64 w-full" />
  if (!estadoIa.disponible) {
    return (
      <EstadoVacio
        icono={Bot}
        titulo="El asistente no está disponible"
        descripcion="La IA no está configurada en el servidor. La historia clínica se consulta en su pestaña, como siempre."
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 whitespace-nowrap">
            <Bot className="size-5 shrink-0 text-marca" aria-hidden />
            Asistente clínico
          </CardTitle>
          <CardDescription>
            {compacto
              ? "Pregunte por la historia de este paciente. No reemplaza el criterio médico."
              : "Responde solo con la historia de este paciente y cita de dónde sale cada dato. No reemplaza el criterio médico."}
          </CardDescription>
        </div>
        {mensajes.length > 0 && (
          <Button
            variant="ghost"
            size={compacto ? "icon-sm" : "sm"}
            className="shrink-0"
            onClick={() => {
              setMensajes([])
              setError(null)
            }}
            disabled={enviando}
            title="Nueva conversación"
            aria-label="Nueva conversación"
          >
            <Eraser className="size-4" />
            {!compacto && "Nueva conversación"}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={cn(
            "space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3",
            compacto ? "max-h-80" : "max-h-[28rem]"
          )}
          aria-live="polite"
        >
          {mensajes.length === 0 && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pregunte por medicación previa, alergias, diagnósticos o un
                resumen de las atenciones. Por ejemplo:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PREGUNTAS_SUGERIDAS.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    onClick={() => preguntar(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <BurbujaMensaje key={i} mensaje={m} />
          ))}

          {enviando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="size-4 animate-pulse" aria-hidden />
              Revisando la historia clínica…
            </div>
          )}
          <div ref={final} />
        </div>

        {error && <Alerta>{error}</Alerta>}

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            preguntar(pregunta)
          }}
        >
          <Textarea
            value={pregunta}
            onChange={(e) =>
              setPregunta(e.target.value.slice(0, MAXIMO_PREGUNTA))
            }
            onKeyDown={(e) => {
              // Enter envía; Mayús + Enter hace un salto de línea
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                preguntar(pregunta)
              }
            }}
            placeholder="Escriba su pregunta sobre este paciente…"
            rows={2}
            className="min-h-0 flex-1 resize-none"
            aria-label="Pregunta para el asistente"
            disabled={enviando}
          />
          <Button
            type="submit"
            disabled={enviando || !pregunta.trim()}
            className="sm:w-auto"
          >
            <Send className="size-4" />
            Preguntar
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Datos ficticios de demostración. La conversación no se guarda; cada
          consulta queda registrada en la auditoría.
        </p>
      </CardContent>
    </Card>
  )
}

function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  if (mensaje.autor === "MEDICO") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-marca px-3.5 py-2 text-sm whitespace-pre-wrap text-white">
          {mensaje.texto}
        </p>
      </div>
    )
  }
  return <BurbujaAsistente mensaje={mensaje} />
}

function BurbujaAsistente({
  mensaje,
}: {
  mensaje: Extract<Mensaje, { autor: "ASISTENTE" }>
}) {
  // Una respuesta puede citar muchas atenciones: se muestran las primeras y el resto a pedido
  const [todas, setTodas] = React.useState(false)
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm border bg-background px-3.5 py-2.5 text-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{mensaje.texto}</p>

        {mensaje.advertencias.map((a) => (
          <p
            key={a}
            role="alert"
            className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {a}
          </p>
        ))}

        {mensaje.sugerencia && (
          <p className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Sugerencia de apoyo: no reemplaza el criterio médico.
          </p>
        )}

        {mensaje.fuentes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs text-muted-foreground">Fuentes:</span>
            {(todas ? mensaje.fuentes : mensaje.fuentes.slice(0, FUENTES_VISIBLES)).map((f) => (
              <Badge
                key={f.id}
                variant="secondary"
                className="gap-1 font-normal"
              >
                <FileText className="size-3" aria-hidden />
                {f.etiqueta}
              </Badge>
            ))}
            {mensaje.fuentes.length > FUENTES_VISIBLES && (
              <button
                type="button"
                className="text-xs font-medium text-marca hover:underline"
                onClick={() => setTodas((t) => !t)}
              >
                {todas
                  ? "Ver menos"
                  : `+${mensaje.fuentes.length - FUENTES_VISIBLES} más`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
