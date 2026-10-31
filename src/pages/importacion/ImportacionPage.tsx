import * as React from "react"
import { FileStack, RotateCcw, Upload } from "lucide-react"
import { toast } from "sonner"

import { Alerta } from "@/components/form"
import { EncabezadoPagina, EstadoVacio } from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api } from "@/lib/api"
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
}

const MAXIMO_POR_ARCHIVO = 10 * 1024 * 1024

/**
 * Importación masiva de historias anteriores (plan.md, sección 5.5.1). Los archivos se envían de uno en uno: un lote
 * grande no ocupa la memoria del servidor y un archivo con problemas no detiene a los demás.
 */
export function ImportacionPage() {
  const ruta = useRuta()
  const id = Number(partesDeRuta(ruta, "importacion")[0])
  const { datos, error, recargar } = useApi<Importacion[]>("/api/importaciones")
  useReloj(5_000, recargar)
  const [avance, setAvance] = React.useState<{
    van: number
    total: number
  } | null>(null)
  const [fallidos, setFallidos] = React.useState<string[]>([])

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
  }

  async function reintentar(i: Importacion) {
    await api(`/api/importaciones/${i.id}/reintento`, { method: "POST" })
    recargar()
  }

  if (id) {
    return (
      <RevisionImportacion
        key={id}
        id={id}
        alTerminar={() => {
          recargar()
          irA(RUTA_VISTA.importacion)
        }}
      />
    )
  }

  const porAprobar = datos?.filter((i) => i.estado === "LISTA").length ?? 0
  const enCola =
    datos?.filter((i) => i.estado === "EN_COLA" || i.estado === "PROCESANDO")
      .length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Importar historias"
        descripcion={`${porAprobar} por aprobar · ${enCola} en cola`}
      />
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Suba las historias en PDF, JPG o PNG (hasta 10 MB cada una). La IA
            lee los datos personales y clínicos de uno en uno; luego usted
            revisa y aprueba cada documento.
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
      {!datos ? (
        <Skeleton className="h-40 w-full" />
      ) : datos.length === 0 ? (
        <EstadoVacio
          icono={FileStack}
          titulo="Aún no hay documentos"
          descripcion="Suba las historias anteriores para centralizarlas."
        />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {datos.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {i.nombreArchivo}
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
                      onClick={() => void reintentar(i)}
                    >
                      <RotateCcw />
                      Reintentar
                    </Button>
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
