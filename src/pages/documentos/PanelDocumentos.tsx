import * as React from "react"
import { Ban, Eye, FileImage, FileText, FolderOpen, Upload } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError, abrirArchivo, api, json } from "@/lib/api"
import { fechaLocal, hoyISO } from "@/lib/fechas"
import {
  NOMBRE_TIPO_DOCUMENTO_CLINICO,
  type DocumentoClinico,
  type TipoDocumentoClinico,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"

const MAXIMO_BYTES = 10 * 1024 * 1024
const ACEPTADOS = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short" })

function tamanio(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Documentos clínicos del paciente (plan.md, sección 5.5). Suben ADMISION, TRIAJE y MEDICO. El contenido solo
 * lo ven TRIAJE y MEDICO: ADMISION ve la lista (para no subir duplicados), pero no abre los documentos.
 */
export function PanelDocumentos({
  pacienteId,
  citaId,
}: {
  pacienteId: number
  citaId?: number
}) {
  const { usuario } = useAuth()
  const puedeVer = usuario?.rol === "TRIAJE" || usuario?.rol === "MEDICO"
  const {
    datos: documentos,
    error: errorCarga,
    recargar,
  } = useApi<DocumentoClinico[]>(`/api/pacientes/${pacienteId}/documentos`)
  const [subiendo, setSubiendo] = React.useState(false)
  const [verAnulados, setVerAnulados] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const vigentes = documentos?.filter((d) => d.estado === "RECIBIDO") ?? []
  const anulados = documentos?.filter((d) => d.estado === "ANULADO") ?? []

  const { pedirTexto } = useConfirmacion()

  async function ver(d: DocumentoClinico) {
    setError(null)
    try {
      await abrirArchivo(`/api/documentos/${d.id}/archivo`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el documento")
    }
  }

  async function anular(d: DocumentoClinico) {
    const motivo = await pedirTexto({
      titulo: `¿Anular «${d.nombreOriginal}»?`,
      descripcion:
        "El registro se conserva, pero su contenido deja de mostrarse.",
      etiqueta: "Motivo de la anulación",
      placeholder: "ej. corresponde a otro paciente",
      accion: "Anular documento",
      destructivo: true,
    })
    if (!motivo) return
    setError(null)
    try {
      await api(`/api/documentos/${d.id}/anular`, {
        method: "PATCH",
        ...json({ motivo }),
      })
      recargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular")
    }
  }

  // Anula quien lo subió o un médico (el backend lo vuelve a verificar)
  const puedeAnular = (d: DocumentoClinico) =>
    usuario?.rol === "MEDICO" || d.subidoPorId === usuario?.id

  return (
    <div className="flex flex-col gap-3 text-sm">
      {(error ?? errorCarga) && <Alerta>{error ?? errorCarga}</Alerta>}

      {documentos && vigentes.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-muted-foreground">
          <FolderOpen className="size-4 shrink-0" aria-hidden />
          No hay documentos.
        </p>
      )}
      {vigentes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {vigentes.map((d) => {
            const imagen = d.contentType.startsWith("image/")
            const Icono = imagen ? FileImage : FileText
            return (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marca-claro text-marca dark:bg-muted">
                  <Icono className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {NOMBRE_TIPO_DOCUMENTO_CLINICO[d.tipo]}
                    </Badge>
                    {d.descripcion && (
                      <span className="font-medium">{d.descripcion}</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {d.fechaDocumento &&
                      `${formatoFecha.format(fechaLocal(d.fechaDocumento))} · `}
                    {d.nombreOriginal} · {tamanio(d.tamanioBytes)} · subido por{" "}
                    {d.subidoPor}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {puedeVer && (
                    <Button size="xs" variant="outline" onClick={() => ver(d)}>
                      <Eye />
                      Ver
                    </Button>
                  )}
                  {puedeAnular(d) && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => anular(d)}
                    >
                      <Ban />
                      Anular
                    </Button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {subiendo ? (
        <FormularioSubida
          pacienteId={pacienteId}
          citaId={citaId}
          alGuardar={() => {
            setSubiendo(false)
            recargar()
          }}
          alCancelar={() => setSubiendo(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => setSubiendo(true)}
        >
          <Upload />
          Subir documento
        </Button>
      )}

      {anulados.length > 0 && (
        <div className="text-xs">
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setVerAnulados((v) => !v)}
          >
            {verAnulados ? "Ocultar" : "Ver"} {anulados.length} anulado(s)
          </button>
          {verAnulados && (
            <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
              {anulados.map((d) => (
                <li key={d.id}>
                  <s>{d.nombreOriginal}</s> — {d.motivoAnulacion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function FormularioSubida({
  pacienteId,
  citaId,
  alGuardar,
  alCancelar,
}: {
  pacienteId: number
  citaId?: number
  alGuardar: () => void
  alCancelar: () => void
}) {
  const [archivo, setArchivo] = React.useState<File | null>(null)
  const [tipo, setTipo] = React.useState<TipoDocumentoClinico>("LABORATORIO")
  const [descripcion, setDescripcion] = React.useState("")
  const [fecha, setFecha] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  // Sin <form>: este panel puede quedar dentro de otro formulario (los formularios HTML no se anidan)
  async function subir() {
    setError(null)
    if (!archivo) {
      setError("Elija un archivo")
      return
    }
    if (archivo.size > MAXIMO_BYTES) {
      setError("El archivo supera el máximo de 10 MB")
      return
    }
    const datos = new FormData()
    datos.append("archivo", archivo)
    datos.append("tipo", tipo)
    if (descripcion.trim()) datos.append("descripcion", descripcion.trim())
    if (fecha) datos.append("fechaDocumento", fecha)
    if (citaId) datos.append("citaId", String(citaId))
    setEnviando(true)
    try {
      await api(`/api/pacientes/${pacienteId}/documentos`, {
        method: "POST",
        body: datos,
      })
      alGuardar()
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo subir el documento"
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      {error && <Alerta>{error}</Alerta>}
      <Campo label="Archivo (PDF, JPG o PNG; máximo 10 MB)">
        <Input
          type="file"
          accept={ACEPTADOS}
          className="py-1.5 file:mr-3 file:rounded-md file:bg-marca-claro file:px-2 file:text-marca-oscuro dark:file:bg-muted dark:file:text-foreground"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Tipo">
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumentoClinico)}
          >
            {(
              Object.keys(
                NOMBRE_TIPO_DOCUMENTO_CLINICO
              ) as TipoDocumentoClinico[]
            ).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO_DOCUMENTO_CLINICO[t]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Fecha del documento (opcional)">
          <Input
            type="date"
            max={hoyISO()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
      </div>
      <Campo label="Descripción (opcional)">
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={200}
          placeholder="ej. Hemograma completo, Laboratorio del Hospital X"
        />
      </Campo>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={enviando} onClick={subir}>
          <Upload />
          {enviando ? "Subiendo…" : "Subir"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
