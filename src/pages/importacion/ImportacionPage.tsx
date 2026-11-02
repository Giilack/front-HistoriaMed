import * as React from "react"
import { Ban, FileStack, RotateCcw, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { EncabezadoPagina, EstadoVacio } from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api, json } from "@/lib/api"
import { irA, partesDeRuta, RUTA_VISTA, useRuta } from "@/lib/rutas"
import type { EstadoImportacion, Importacion } from "@/lib/types"
import { useApi, useReloj } from "@/lib/useApi"
import { RevisionImportacion } from "@/pages/importacion/RevisionImportacion"

const ESTADOS: Record<EstadoImportacion, { texto: string; clase: string }> = {
  EN_COLA: { texto: "En cola", clase: "bg-muted text-foreground" },
  PROCESANDO: {
    texto: "IA leyendo…",
    clase: "bg-marca-claro text-marca-oscuro",
  },
  LISTA: { texto: "Por aprobar", clase: "bg-amber-100 text-amber-900" },
  ERROR: { texto: "Error", clase: "bg-destructive/12 text-destructive" },
  APROBADA: { texto: "Aprobada", clase: "bg-emerald-100 text-emerald-900" },
  RECHAZADA: { texto: "Rechazada", clase: "bg-muted text-muted-foreground" },
  ELIMINADA: { texto: "Eliminada", clase: "bg-muted text-muted-foreground" },
  ANULADA: { texto: "Anulada", clase: "bg-muted text-muted-foreground" },
}

const MAXIMO_POR_ARCHIVO = 10 * 1024 * 1024

const CERRADAS: EstadoImportacion[] = ["RECHAZADA", "ELIMINADA", "ANULADA"]

/**
 * Importación masiva de historias anteriores (plan.md, sección 5.5.1). Los archivos se envían de uno en uno: un lote
 * grande no ocupa la memoria del servidor y un archivo con problemas no detiene a los demás.
 */
export function ImportacionPage() {
  const ruta = useRuta()
  const id = Number(partesDeRuta(ruta, "importacion")[0])
  const { datos, error, recargar } = useApi<Importacion[]>("/api/importaciones")
  const { datos: espacio, recargar: recargarEspacio } = useApi<{
    usadoMb: number
    cuotaMb: number
  }>("/api/importaciones/espacio")
  useReloj(5_000, recargar)
  const { confirmar } = useConfirmacion()
  const [avance, setAvance] = React.useState<{
    van: number
    total: number
  } | null>(null)
  const [fallidos, setFallidos] = React.useState<string[]>([])
  const [filtro, setFiltro] = React.useState("ABIERTAS")
  const [texto, setTexto] = React.useState("")
  const [anulando, setAnulando] = React.useState<number | null>(null)
  const [motivo, setMotivo] = React.useState("")
  const [accionError, setAccionError] = React.useState<string | null>(null)

  async function subir(archivos: File[]) {
    setFallidos([])
    const errores: string[] = []
    for (const [i, archivo] of archivos.entries()) {
      setAvance({ van: i + 1, total: archivos.length })
      if (archivo.size > MAXIMO_POR_ARCHIVO) {
        errores.push(`${archivo.name}: supera los 10 MB`)
        continue
      }
      const cuerpo = new FormData()
      cuerpo.append("archivo", archivo)
      try {
        await api("/api/importaciones", { method: "POST", body: cuerpo })
      } catch (e) {
        errores.push(
          `${archivo.name}: ${e instanceof ApiError ? e.message : "no se pudo subir"}`
        )
      }
    }
    setAvance(null)
    setFallidos(errores)
    const subidos = archivos.length - errores.length
    if (subidos > 0) toast.success(`${subidos} documento(s) en la cola`)
    recargar()
    recargarEspacio()
  }

  async function accion(ejecutar: () => Promise<unknown>, exito: string) {
    setAccionError(null)
    try {
      await ejecutar()
      toast.success(exito)
      recargar()
      recargarEspacio()
    } catch (e) {
      setAccionError(
        e instanceof ApiError ? e.message : "No se pudo completar la acción"
      )
    }
  }

  async function eliminar(i: Importacion) {
    const si = await confirmar({
      titulo: `¿Eliminar ${i.nombreArchivo}?`,
      descripcion:
        "El archivo y los datos extraídos se borran. Nada pasó a la historia clínica.",
      accion: "Sí, eliminar",
      destructivo: true,
    })
    if (si) {
      await accion(
        () => api(`/api/importaciones/${i.id}`, { method: "DELETE" }),
        "Documento eliminado"
      )
    }
  }

  async function anular(i: Importacion) {
    await accion(
      () =>
        api(`/api/importaciones/${i.id}/anulacion`, {
          method: "POST",
          ...json({ motivo }),
        }),
      "Importación anulada"
    )
    setAnulando(null)
    setMotivo("")
  }

  if (id) {
    return (
      <RevisionImportacion
        key={id}
        id={id}
        alTerminar={() => {
          recargar()
          recargarEspacio()
          irA(RUTA_VISTA.importacion)
        }}
        alSiguiente={(siguiente) =>
          irA(`${RUTA_VISTA.importacion}/${siguiente}`)
        }
      />
    )
  }

  const cuenta = (...estados: EstadoImportacion[]) =>
    datos?.filter((i) => estados.includes(i.estado)).length ?? 0
  const busqueda = texto.trim().toLowerCase()
  const visibles = (datos ?? []).filter(
    (i) =>
      (filtro === "TODAS" ||
        (filtro === "ABIERTAS"
          ? !CERRADAS.includes(i.estado)
          : i.estado === filtro)) &&
      (!busqueda || i.nombreArchivo.toLowerCase().includes(busqueda))
  )
  const usado = espacio ? (espacio.usadoMb / espacio.cuotaMb) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Importar historias"
        descripcion={`${cuenta("LISTA")} por aprobar · ${cuenta("EN_COLA", "PROCESANDO")} en cola · ${cuenta("APROBADA")} aprobadas · ${cuenta("ERROR")} con error`}
      />
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Suba las historias en PDF, JPG o PNG (hasta 10 MB cada una). La IA
            lee los datos de uno en uno; luego usted compara, corrige y aprueba
            cada documento. Debe haber un solo paciente por archivo.
          </p>
          <label className="self-start">
            <span className="sr-only">Elegir documentos</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-marca file:px-3 file:py-2 file:text-white"
              disabled={avance !== null}
              onChange={(e) => {
                const lista = [...(e.target.files ?? [])]
                e.target.value = ""
                if (lista.length > 0) void subir(lista)
              }}
            />
          </label>
          {avance && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Upload className="size-4 animate-pulse" aria-hidden />
              Subiendo {avance.van} de {avance.total}…
            </p>
          )}
          {espacio && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                Espacio usado: {espacio.usadoMb} de {espacio.cuotaMb} MB
              </p>
              <div
                role="progressbar"
                aria-label="Espacio usado"
                aria-valuenow={Math.round(usado)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={
                    usado >= 85 ? "h-full bg-destructive" : "h-full bg-marca"
                  }
                  style={{ width: `${Math.min(usado, 100)}%` }}
                />
              </div>
              {usado >= 85 && (
                <p className="text-xs font-medium text-destructive">
                  Queda poco espacio. Elimine los documentos que no necesite.
                </p>
              )}
            </div>
          )}
          {fallidos.length > 0 && (
            <Alerta>
              <ul>
                {fallidos.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Alerta>
          )}
        </CardContent>
      </Card>

      {error && <Alerta>{error}</Alerta>}
      {accionError && <Alerta>{accionError}</Alerta>}
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <Campo label="Mostrar">
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="ABIERTAS">Vigentes</option>
            <option value="LISTA">Por aprobar</option>
            <option value="ERROR">Con error</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="ANULADA">Anuladas</option>
            <option value="ELIMINADA">Eliminadas</option>
            <option value="TODAS">Todas</option>
          </Select>
        </Campo>
        <Campo label="Buscar por archivo">
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
      </div>

      {!datos ? (
        <Skeleton className="h-40 w-full" />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={FileStack}
          titulo="No hay documentos para mostrar"
          descripcion="Suba las historias anteriores para centralizarlas."
        />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {visibles.map((i) => (
                <li key={i.id} className="flex flex-col gap-2 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {i.nombreArchivo}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Subido por {i.subidoPor}
                      </span>
                      {i.error && (
                        <span className="block text-xs text-destructive">
                          {i.error}
                        </span>
                      )}
                      {i.motivoRechazo && (
                        <span className="block text-xs text-muted-foreground">
                          {i.motivoRechazo}
                        </span>
                      )}
                    </span>
                    <Badge className={ESTADOS[i.estado].clase}>
                      {ESTADOS[i.estado].texto}
                    </Badge>
                    {i.estado === "LISTA" && (
                      <Button
                        size="sm"
                        onClick={() => irA(`${RUTA_VISTA.importacion}/${i.id}`)}
                      >
                        Revisar
                      </Button>
                    )}
                    {i.estado === "ERROR" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void accion(
                            () =>
                              api(`/api/importaciones/${i.id}/reintento`, {
                                method: "POST",
                              }),
                            "Documento en la cola"
                          )
                        }
                      >
                        <RotateCcw />
                        Reintentar
                      </Button>
                    )}
                    {i.estado === "APROBADA" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMotivo("")
                          setAnulando(i.id)
                        }}
                      >
                        <Ban />
                        Anular
                      </Button>
                    )}
                    {(i.estado === "EN_COLA" ||
                      i.estado === "LISTA" ||
                      i.estado === "ERROR") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Eliminar ${i.nombreArchivo}`}
                        onClick={() => void eliminar(i)}
                      >
                        <Trash2 />
                        Eliminar
                      </Button>
                    )}
                  </div>
                  {anulando === i.id && (
                    <div className="flex flex-col gap-2 rounded-lg border p-3">
                      <p className="text-sm">
                        Lo registrado quedará inactivo, con este motivo. Nada se
                        borra de la historia.
                      </p>
                      <Campo label="Motivo de la anulación">
                        <Input
                          autoFocus
                          maxLength={300}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                      </Campo>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAnulando(null)}
                        >
                          Volver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!motivo.trim()}
                          onClick={() => void anular(i)}
                        >
                          Confirmar anulación
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
