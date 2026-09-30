import * as React from "react"
import {
  ClipboardCheck,
  ClipboardPlus,
  ExternalLink,
  FlaskConical,
  History,
  Pencil,
  Pill,
  Plus,
  ShieldAlert,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthContext"
import { Alerta, Input } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { abrirArchivo, api, json } from "@/lib/api"
import { avisarCambioClinico } from "@/lib/cambiosClinicos"
import { formatearFecha } from "@/lib/fechas"
import {
  NOMBRE_CATEGORIA,
  NOMBRE_GRAVEDAD,
  NOMBRE_TIPO_ALERGIA,
  NOMBRE_TIPO_ANTECEDENTE,
  NOMBRE_TIPO_DOCUMENTO_CLINICO,
  type CategoriaItem,
  type DocumentoClinico,
  type EstadoExtraccion,
  type EstadoItem,
  type Extraccion,
  type ItemExtraccion,
} from "@/lib/types"
import { cn } from "@/lib/utils"

import { FormularioItem } from "./FormularioItem"

const CATEGORIAS: {
  categoria: CategoriaItem
  icono: LucideIcon
  boton: string
}[] = [
  { categoria: "LABORATORIO", icono: FlaskConical, boton: "Laboratorio" },
  { categoria: "DIAGNOSTICO", icono: ClipboardPlus, boton: "Diagnóstico" },
  { categoria: "MEDICAMENTO", icono: Pill, boton: "Medicamento" },
  { categoria: "ALERGIA", icono: ShieldAlert, boton: "Alergia" },
  { categoria: "ANTECEDENTE", icono: History, boton: "Antecedente" },
  { categoria: "OTRO", icono: StickyNote, boton: "Otro" },
]

const ESTADO_REVISION: Record<
  EstadoExtraccion,
  { texto: string; clase: string }
> = {
  PENDIENTE_REVISION: {
    texto: "Pendiente de validación",
    clase: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  },
  VALIDADA: {
    texto: "Validada",
    clase: "bg-green-600/12 text-green-700 dark:text-green-400",
  },
  RECHAZADA: {
    texto: "Rechazada",
    clase: "bg-destructive/12 text-destructive",
  },
}

const ESTADO_ITEM: Record<EstadoItem, { texto: string; clase: string }> = {
  PROPUESTO: { texto: "Propuesto", clase: "bg-muted text-muted-foreground" },
  ACEPTADO: {
    texto: "Aceptado",
    clase: "bg-green-600/12 text-green-700 dark:text-green-400",
  },
  CORREGIDO: {
    texto: "Aceptado con corrección",
    clase:
      "bg-marca-claro text-marca-oscuro dark:bg-muted dark:text-foreground",
  },
  DESCARTADO: { texto: "Descartado", clase: "bg-muted text-muted-foreground" },
}

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
})

/** Etiqueta del estado de una revisión (también se usa en la lista de documentos). */
export function EstadoRevisionEtiqueta({
  estado,
}: {
  estado: EstadoExtraccion
}) {
  const e = ESTADO_REVISION[estado]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        e.clase
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {e.texto}
    </span>
  )
}

const aperturas = new Map<number, Promise<Extraccion>>()

/**
 * Abre la revisión vigente del documento o crea una nueva. Si se pide dos veces a la vez (React monta los efectos
 * dos veces en desarrollo), ambas comparten la misma petición: así no se intenta crear dos revisiones.
 */
function abrirRevision(documentoId: number) {
  let enCurso = aperturas.get(documentoId)
  if (!enCurso) {
    enCurso = api<Extraccion>(`/api/documentos/${documentoId}/extraccion`, {
      method: "POST",
    }).finally(() => aperturas.delete(documentoId))
    aperturas.set(documentoId, enCurso)
  }
  return enCurso
}

/** Qué se está haciendo en la parte inferior: nada, confirmar la validación o escribir el motivo del rechazo. */
type Pie = "normal" | "validar" | "rechazar"

/**
 * Revisión de los datos de un documento (plan.md, sección 5.5): el documento a la izquierda y sus datos por
 * categoría a la derecha. TRIAJE y MEDICO los llenan; el MEDICO decide cuáles pasan a la historia clínica.
 */
export function RevisionDocumento({
  documento,
  alCerrar,
}: {
  documento: DocumentoClinico
  alCerrar: () => void
}) {
  const { usuario } = useAuth()
  const esMedico = usuario?.rol === "MEDICO"
  const [extraccion, setExtraccion] = React.useState<Extraccion | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Formulario abierto: para agregar (solo categoría) o para editar (con el dato)
  const [formulario, setFormulario] = React.useState<{
    categoria: CategoriaItem
    item?: ItemExtraccion
  } | null>(null)
  // El médico acepta todo por defecto y desmarca lo que no corresponde
  const [descartados, setDescartados] = React.useState<Set<number>>(new Set())
  const [pie, setPie] = React.useState<Pie>("normal")
  const [motivo, setMotivo] = React.useState("")
  const [enviando, setEnviando] = React.useState(false)

  // Abre la revisión vigente del documento o crea una nueva para llenarla a mano
  React.useEffect(() => {
    let vigente = true
    abrirRevision(documento.id)
      .then((e) => vigente && setExtraccion(e))
      .catch(
        (e: unknown) =>
          vigente &&
          setError(
            e instanceof Error ? e.message : "No se pudo abrir la revisión"
          )
      )
    return () => {
      vigente = false
    }
  }, [documento.id])

  const pendiente = extraccion?.estado === "PENDIENTE_REVISION"
  const items = extraccion?.items ?? []
  const aceptados = items.filter((i) => !descartados.has(i.id))

  async function ejecutar(accion: () => Promise<Extraccion>, exito?: string) {
    setError(null)
    setEnviando(true)
    try {
      setExtraccion(await accion())
      setPie("normal")
      if (exito) {
        toast.success(exito)
        avisarCambioClinico()
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    } finally {
      setEnviando(false)
    }
  }

  const quitar = (item: ItemExtraccion) =>
    ejecutar(() =>
      api<Extraccion>(`/api/extracciones/${extraccion!.id}/items/${item.id}`, {
        method: "DELETE",
      })
    )

  const validar = () =>
    ejecutar(
      () =>
        api<Extraccion>(`/api/extracciones/${extraccion!.id}/validacion`, {
          method: "POST",
          ...json({ aceptados: aceptados.map((i) => i.id) }),
        }),
      "Revisión validada: los datos aceptados ya están en la historia clínica"
    )

  const rechazar = () =>
    ejecutar(
      () =>
        api<Extraccion>(`/api/extracciones/${extraccion!.id}/rechazo`, {
          method: "POST",
          ...json({ motivo }),
        }),
      "Revisión rechazada"
    )

  function alternar(id: number) {
    setDescartados((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const puedeTocar = (item: ItemExtraccion) =>
    pendiente && (esMedico || item.creadoPorId === usuario?.id)

  return (
    // No se cierra con un clic fuera: hay datos a medio escribir
    <Dialog
      open
      onOpenChange={(abierto) => !abierto && alCerrar()}
      disablePointerDismissal
    >
      <DialogContent className="flex h-[94svh] w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-5 py-3 pr-14">
          <DialogTitle className="text-base">Datos del documento</DialogTitle>
          {extraccion && <EstadoRevisionEtiqueta estado={extraccion.estado} />}
          <DialogDescription className="w-full truncate text-xs">
            {NOMBRE_TIPO_DOCUMENTO_CLINICO[documento.tipo]}
            {documento.descripcion && ` · ${documento.descripcion}`} ·{" "}
            {documento.nombreOriginal}
            {documento.fechaDocumento &&
              ` · ${formatearFecha(documento.fechaDocumento)}`}
          </DialogDescription>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <div className="hidden min-h-0 border-r bg-muted/40 lg:block">
            <VisorDocumento documento={documento} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
            <Button
              size="sm"
              variant="outline"
              className="self-start lg:hidden"
              onClick={() =>
                abrirArchivo(`/api/documentos/${documento.id}/archivo`).catch(
                  () => setError("No se pudo abrir el documento")
                )
              }
            >
              <ExternalLink />
              Abrir el documento en otra pestaña
            </Button>

            {error && <Alerta>{error}</Alerta>}

            {!extraccion && !error && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            )}

            {extraccion && (
              <>
                <Aviso extraccion={extraccion} esMedico={esMedico} />

                {CATEGORIAS.filter(({ categoria }) =>
                  items.some((i) => i.categoria === categoria)
                ).map(({ categoria, icono: Icono }) => (
                  <section key={categoria} className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-marca-oscuro uppercase dark:text-muted-foreground">
                      <Icono className="size-4 text-marca" aria-hidden />
                      {NOMBRE_CATEGORIA[categoria]}
                    </h3>
                    {items
                      .filter((i) => i.categoria === categoria)
                      .map((item) =>
                        formulario?.item?.id === item.id ? (
                          <FormularioItem
                            key={item.id}
                            extraccionId={extraccion.id}
                            categoria={categoria}
                            item={item}
                            alGuardar={(e) => {
                              setExtraccion(e)
                              setFormulario(null)
                            }}
                            alCancelar={() => setFormulario(null)}
                          />
                        ) : (
                          <FilaItem
                            key={item.id}
                            item={item}
                            // Solo el médico decide, y solo mientras la revisión está pendiente
                            seleccion={
                              pendiente && esMedico
                                ? {
                                    aceptado: !descartados.has(item.id),
                                    alCambiar: () => alternar(item.id),
                                  }
                                : undefined
                            }
                            mostrarEstado={!pendiente}
                            acciones={
                              puedeTocar(item) && (
                                <>
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={`Editar ${item.descripcion}`}
                                    onClick={() =>
                                      setFormulario({ categoria, item })
                                    }
                                  >
                                    <Pencil />
                                  </Button>
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label={`Quitar ${item.descripcion}`}
                                    disabled={enviando}
                                    onClick={() => quitar(item)}
                                  >
                                    <Trash2 />
                                  </Button>
                                </>
                              )
                            }
                          />
                        )
                      )}
                  </section>
                ))}

                {pendiente && items.length === 0 && !formulario && (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Todavía no hay datos. Elija abajo qué tipo de dato quiere
                    agregar.
                  </p>
                )}

                {pendiente &&
                  (formulario && !formulario.item ? (
                    <FormularioItem
                      // Al cambiar de categoría se empieza un formulario limpio
                      key={formulario.categoria}
                      extraccionId={extraccion.id}
                      categoria={formulario.categoria}
                      alGuardar={(e) => {
                        setExtraccion(e)
                        setFormulario(null)
                      }}
                      alCancelar={() => setFormulario(null)}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 border-t pt-4">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Plus className="size-4" aria-hidden />
                        Agregar dato
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIAS.map(
                          ({ categoria, icono: Icono, boton }) => (
                            <Button
                              key={categoria}
                              size="sm"
                              variant="outline"
                              onClick={() => setFormulario({ categoria })}
                            >
                              <Icono />
                              {boton}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-card px-5 py-3">
          {pendiente && esMedico && pie === "normal" && (
            <>
              <Button
                variant="ghost"
                className="mr-auto text-muted-foreground hover:text-destructive"
                onClick={() => setPie("rechazar")}
              >
                Rechazar revisión
              </Button>
              <span className="text-sm text-muted-foreground">
                {aceptados.length === items.length
                  ? "Todos los datos pasarán a la historia"
                  : `${aceptados.length} de ${items.length} pasarán a la historia`}
              </span>
              <Button
                disabled={items.length === 0 || !!formulario}
                onClick={() => setPie("validar")}
              >
                <ClipboardCheck />
                Validar
              </Button>
            </>
          )}

          {pendiente && esMedico && pie === "validar" && (
            <>
              <p className="mr-auto max-w-xl text-sm">
                <b>
                  Pasarán a la historia clínica: {aceptados.length}. Quedarán
                  descartados: {items.length - aceptados.length}.
                </b>{" "}
                Después la revisión no se puede modificar.
              </p>
              <Button variant="outline" onClick={() => setPie("normal")}>
                Volver
              </Button>
              <Button disabled={enviando} onClick={validar}>
                {enviando ? "Validando…" : "Confirmar validación"}
              </Button>
            </>
          )}

          {pendiente && esMedico && pie === "rechazar" && (
            <>
              <Input
                autoFocus
                className="mr-auto max-w-md flex-1"
                aria-label="Motivo del rechazo"
                placeholder="Motivo: ej. documento ilegible, es de otro paciente"
                maxLength={300}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <Button variant="outline" onClick={() => setPie("normal")}>
                Volver
              </Button>
              <Button
                variant="destructive"
                disabled={enviando || !motivo.trim()}
                onClick={rechazar}
              >
                Rechazar revisión
              </Button>
            </>
          )}

          {pendiente && !esMedico && (
            <span className="mr-auto text-sm text-muted-foreground">
              Los datos se guardan al agregarlos. Un médico debe validarlos.
            </span>
          )}

          {(!pendiente || !esMedico) && (
            <Button variant="outline" onClick={alCerrar}>
              Cerrar
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  )
}

/** Explica qué hacer según el estado de la revisión y el rol. */
function Aviso({
  extraccion: e,
  esMedico,
}: {
  extraccion: Extraccion
  esMedico: boolean
}) {
  if (e.estado === "PENDIENTE_REVISION") {
    return (
      <Alerta tipo="info">
        {esMedico
          ? "Compare cada dato con el documento. Los que deje marcados pasarán a la historia clínica al validar; los demás quedan descartados."
          : "Registre los datos que aparecen en el documento. No pasan a la historia clínica hasta que un médico los valide."}
      </Alerta>
    )
  }
  const cuando = e.revisadoEn
    ? formatoFechaHora.format(new Date(e.revisadoEn))
    : ""
  return e.estado === "VALIDADA" ? (
    <Alerta tipo="exito">
      Validada por {e.revisadoPor} el {cuando}. Los datos aceptados están en la
      historia clínica del paciente.
    </Alerta>
  ) : (
    <Alerta>
      Rechazada por {e.revisadoPor} el {cuando}: {e.motivoRechazo}. Ningún dato
      pasó a la historia clínica.
    </Alerta>
  )
}

/** Un dato de la revisión, mostrado según su categoría. */
function FilaItem({
  item,
  seleccion,
  mostrarEstado,
  acciones,
}: {
  item: ItemExtraccion
  seleccion?: { aceptado: boolean; alCambiar: () => void }
  mostrarEstado: boolean
  acciones?: React.ReactNode
}) {
  const descartado =
    item.estado === "DESCARTADO" || (seleccion && !seleccion.aceptado)
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card px-3 py-2 text-sm",
        descartado && "opacity-60"
      )}
    >
      {seleccion && (
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0"
          checked={seleccion.aceptado}
          onChange={seleccion.alCambiar}
          aria-label={`Aceptar ${item.descripcion}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Contenido item={item} />
        </div>
        {item.fragmentoOrigen && (
          <p className="mt-1 border-l-2 border-marca-acento pl-2 font-mono text-xs text-muted-foreground">
            «{item.fragmentoOrigen}»{item.pagina && ` · pág. ${item.pagina}`}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Registrado por {item.creadoPor}
          {item.corregido &&
            item.estado === "PROPUESTO" &&
            " · corregido por el médico"}
        </p>
      </div>
      {mostrarEstado && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            ESTADO_ITEM[item.estado].clase
          )}
        >
          {ESTADO_ITEM[item.estado].texto}
        </span>
      )}
      {acciones && <div className="flex shrink-0 gap-0.5">{acciones}</div>}
    </div>
  )
}

function Contenido({ item: i }: { item: ItemExtraccion }) {
  const fecha = i.fecha && (
    <span className="text-xs text-muted-foreground">
      {formatearFecha(i.fecha)}
    </span>
  )
  const detalle = i.detalle && (
    <span className="w-full text-muted-foreground">{i.detalle}</span>
  )
  switch (i.categoria) {
    case "ALERGIA":
      return (
        <>
          <b>{i.descripcion}</b>
          {i.tipoAlergia && (
            <Badge variant="secondary">
              {NOMBRE_TIPO_ALERGIA[i.tipoAlergia]}
            </Badge>
          )}
          {i.gravedad && (
            <Badge
              variant={i.gravedad === "SEVERA" ? "destructive" : "outline"}
            >
              {NOMBRE_GRAVEDAD[i.gravedad]}
            </Badge>
          )}
          {i.detalle && (
            <span className="w-full text-muted-foreground">
              Reacción: {i.detalle}
            </span>
          )}
        </>
      )
    case "DIAGNOSTICO":
      return (
        <>
          <Badge variant="outline" className="font-mono">
            {i.cieCodigo}
          </Badge>
          <b className="min-w-0">{i.descripcion}</b>
          {fecha}
          {detalle}
        </>
      )
    case "LABORATORIO":
      return (
        <>
          <b>{i.descripcion}</b>
          <span className="font-semibold text-marca-oscuro tabular-nums dark:text-foreground">
            {i.valor} {i.unidad}
          </span>
          {i.rangoReferencia && (
            <span className="text-xs text-muted-foreground">
              (ref. {i.rangoReferencia})
            </span>
          )}
          {fecha}
        </>
      )
    case "ANTECEDENTE":
      return (
        <>
          {i.tipoAntecedente && (
            <Badge variant="secondary">
              {NOMBRE_TIPO_ANTECEDENTE[i.tipoAntecedente]}
            </Badge>
          )}
          <b className="min-w-0">{i.descripcion}</b>
          {fecha}
        </>
      )
    default:
      return (
        <>
          <b className="min-w-0">{i.descripcion}</b>
          {fecha}
          {detalle}
        </>
      )
  }
}

/** Muestra el documento (PDF o imagen). Se descarga con el token y se muestra desde memoria. */
function VisorDocumento({ documento }: { documento: DocumentoClinico }) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let vigente = true
    let creada: string | null = null
    api<Blob>(`/api/documentos/${documento.id}/archivo`, {}, "blob")
      .then((blob) => {
        if (!vigente) return
        creada = URL.createObjectURL(blob)
        setUrl(creada)
      })
      .catch(
        (e: unknown) =>
          vigente &&
          setError(
            e instanceof Error ? e.message : "No se pudo cargar el documento"
          )
      )
    return () => {
      vigente = false
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [documento.id])

  if (error)
    return (
      <div className="p-4">
        <Alerta>{error}</Alerta>
      </div>
    )
  if (!url) return <Skeleton className="m-4 h-[calc(100%-2rem)]" />
  return documento.contentType.startsWith("image/") ? (
    <div className="flex size-full items-start justify-center overflow-auto p-3">
      <img
        src={url}
        alt={documento.nombreOriginal}
        className="max-w-full rounded-md shadow-sm"
      />
    </div>
  ) : (
    <iframe src={url} title={documento.nombreOriginal} className="size-full" />
  )
}
