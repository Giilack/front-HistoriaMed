import * as React from "react"
import { ArrowLeft, TriangleAlert, UserCheck, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api, json } from "@/lib/api"
import { NOMBRE_TIPO_DOCUMENTO } from "@/lib/types"
import type {
  DatoImportado,
  DetalleImportacion,
  Sexo,
  TipoDocumento,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"

const CATEGORIAS: Record<string, string> = {
  ALERGIA: "Alergias",
  DIAGNOSTICO: "Diagnósticos y consultas anteriores",
  MEDICAMENTO: "Medicamentos",
  ANTECEDENTE: "Antecedentes",
  LABORATORIO: "Laboratorio",
  OTRO: "Otra información (no pasa a la historia)",
}

interface Datos {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  fechaNacimiento: string
  sexo: Sexo | ""
  telefono: string
  direccion: string
}

const TIPOS = Object.keys(NOMBRE_TIPO_DOCUMENTO) as TipoDocumento[]

function datosIniciales(d: DetalleImportacion): Datos {
  const p = d.paciente
  return {
    tipoDocumento: TIPOS.find((t) => t === p?.tipoDocumento) ?? "DNI",
    numeroDocumento: p?.numeroDocumento ?? "",
    nombres: p?.nombres ?? "",
    apellidoPaterno: p?.apellidoPaterno ?? "",
    apellidoMaterno: p?.apellidoMaterno ?? "",
    fechaNacimiento: p?.fechaNacimiento ?? "",
    sexo: p?.sexo === "FEMENINO" || p?.sexo === "MASCULINO" ? p.sexo : "",
    telefono: (p?.telefono ?? "").replace(/[^0-9+ ]/g, ""),
    direccion: p?.direccion ?? "",
  }
}

/** Revisión de un documento importado: el PDF al lado de lo que propuso la IA. Admisión decide. */
export function RevisionImportacion({
  id,
  alTerminar,
}: {
  id: number
  alTerminar: () => void
}) {
  const { datos: detalle, error } = useApi<DetalleImportacion>(
    `/api/importaciones/${id}`
  )
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" onClick={alTerminar}>
          <ArrowLeft />
          Volver a la lista
        </Button>
      </div>
      {error && <Alerta>{error}</Alerta>}
      {!detalle ? (
        !error && <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <VisorArchivo id={id} nombre={detalle.importacion.nombreArchivo} />
          <Formulario id={id} detalle={detalle} alTerminar={alTerminar} />
        </div>
      )}
    </div>
  )
}

function VisorArchivo({ id, nombre }: { id: number; nombre: string }) {
  const [url, setUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    let vigente = true
    let creada: string | null = null
    void api<Blob>(`/api/importaciones/${id}/archivo`, {}, "blob").then((b) => {
      if (!vigente) return
      creada = URL.createObjectURL(b)
      setUrl(creada)
    })
    return () => {
      vigente = false
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [id])
  if (!url) return <Skeleton className="h-[70vh] w-full" />
  return (
    <iframe
      src={url}
      title={nombre}
      className="h-[70vh] w-full rounded-lg border lg:h-[80vh]"
    />
  )
}

function Formulario({
  id,
  detalle,
  alTerminar,
}: {
  id: number
  detalle: DetalleImportacion
  alTerminar: () => void
}) {
  const [f, setF] = React.useState<Datos>(() => datosIniciales(detalle))
  const [aceptados, setAceptados] = React.useState<Set<number>>(
    () =>
      new Set(
        detalle.datos.flatMap((d, i) => (d.categoria === "OTRO" ? [] : [i]))
      )
  )
  const [confirmar, setConfirmar] = React.useState(false)
  const [motivo, setMotivo] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)
  const e = detalle.existente
  const dudosa = e !== null && !e.coincideNombre
  const cambiar = (c: Partial<Datos>) => setF((v) => ({ ...v, ...c }))
  const incompleto =
    !f.nombres.trim() ||
    !f.apellidoPaterno.trim() ||
    !f.fechaNacimiento ||
    !f.sexo

  async function aprobar() {
    setError(null)
    setEnviando(true)
    try {
      const r = await api<{
        numeroHc: string
        pacienteNuevo: boolean
        datosRegistrados: number
      }>(`/api/importaciones/${id}/aprobacion`, {
        method: "POST",
        ...json({
          paciente: {
            ...f,
            numeroDocumento: f.numeroDocumento.trim() || null,
            apellidoMaterno: f.apellidoMaterno.trim() || null,
            telefono: f.telefono.trim() || null,
            direccion: f.direccion.trim() || null,
          },
          aceptados: [...aceptados],
          confirmarCoincidencia: confirmar,
        }),
      })
      toast.success(
        r.pacienteNuevo
          ? "Paciente registrado con su historia"
          : "Historia agregada al paciente",
        {
          description: `${r.numeroHc} · ${r.datosRegistrados} dato(s)`,
        }
      )
      alTerminar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aprobar")
    } finally {
      setEnviando(false)
    }
  }

  async function rechazar() {
    if (!motivo?.trim()) return
    setEnviando(true)
    try {
      await api(`/api/importaciones/${id}/rechazo`, {
        method: "POST",
        ...json({ motivo }),
      })
      toast.success("Documento rechazado")
      alTerminar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo rechazar")
      setEnviando(false)
    }
  }

  const grupos = Object.keys(CATEGORIAS).filter((c) =>
    detalle.datos.some((d) => d.categoria === c)
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {e ? (
              <UserCheck className="size-5 text-marca" aria-hidden />
            ) : (
              <UserPlus className="size-5 text-marca" aria-hidden />
            )}
            {e ? "Paciente ya registrado" : "Paciente nuevo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {e && (
            <p className="text-sm">
              {e.nombreCompleto} · {e.numeroHc}. Se agregará la historia; sus
              datos personales no cambian.
            </p>
          )}
          {dudosa && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              <span className="flex items-start gap-2 font-medium">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                El nombre del documento no coincide con el paciente registrado.
              </span>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={confirmar}
                  onCheckedChange={(v) => setConfirmar(v === true)}
                />
                Confirmo que es la misma persona
              </label>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Tipo de documento">
              <Select
                value={f.tipoDocumento}
                onChange={(x) =>
                  cambiar({ tipoDocumento: x.target.value as TipoDocumento })
                }
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO_DOCUMENTO[t]}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Número de documento">
              <Input
                value={f.numeroDocumento}
                onChange={(x) => cambiar({ numeroDocumento: x.target.value })}
              />
            </Campo>
            <Campo label="Nombres">
              <Input
                value={f.nombres}
                onChange={(x) => cambiar({ nombres: x.target.value })}
              />
            </Campo>
            <Campo label="Apellido paterno">
              <Input
                value={f.apellidoPaterno}
                onChange={(x) => cambiar({ apellidoPaterno: x.target.value })}
              />
            </Campo>
            <Campo label="Apellido materno">
              <Input
                value={f.apellidoMaterno}
                onChange={(x) => cambiar({ apellidoMaterno: x.target.value })}
              />
            </Campo>
            <Campo label="Fecha de nacimiento">
              <Input
                type="date"
                value={f.fechaNacimiento}
                onChange={(x) => cambiar({ fechaNacimiento: x.target.value })}
              />
            </Campo>
            <Campo label="Sexo">
              <Select
                value={f.sexo}
                onChange={(x) => cambiar({ sexo: x.target.value as Sexo })}
              >
                <option value="" disabled>
                  Seleccione…
                </option>
                <option value="FEMENINO">Femenino</option>
                <option value="MASCULINO">Masculino</option>
              </Select>
            </Campo>
            <Campo label="Teléfono">
              <Input
                value={f.telefono}
                onChange={(x) => cambiar({ telefono: x.target.value })}
              />
            </Campo>
          </div>
          <Campo label="Dirección">
            <Input
              value={f.direccion}
              onChange={(x) => cambiar({ direccion: x.target.value })}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos para la historia</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Compare cada dato con el documento. Desmarque lo que no corresponda.
          </p>
          {detalle.datos.length === 0 && (
            <p className="text-sm">La IA no encontró datos clínicos.</p>
          )}
          {grupos.map((c) => (
            <fieldset key={c} className="flex flex-col gap-2">
              <legend className="text-sm font-medium">{CATEGORIAS[c]}</legend>
              {detalle.datos.map((d, i) =>
                d.categoria === c ? (
                  <label
                    key={i}
                    className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      className="mt-0.5"
                      disabled={c === "OTRO"}
                      checked={aceptados.has(i)}
                      onCheckedChange={(v) =>
                        setAceptados((a) => {
                          const n = new Set(a)
                          if (v === true) n.add(i)
                          else n.delete(i)
                          return n
                        })
                      }
                    />
                    <TextoDato dato={d} />
                  </label>
                ) : null
              )}
            </fieldset>
          ))}
        </CardContent>
      </Card>

      {error && <Alerta>{error}</Alerta>}
      {motivo === null ? (
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => setMotivo("")}>
            Rechazar documento
          </Button>
          <Button
            disabled={enviando || incompleto || (dudosa && !confirmar)}
            onClick={() => void aprobar()}
          >
            {enviando ? "Aprobando…" : `Aprobar (${aceptados.size} datos)`}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Campo label="Motivo del rechazo">
            <Input
              autoFocus
              maxLength={300}
              value={motivo}
              onChange={(x) => setMotivo(x.target.value)}
            />
          </Campo>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMotivo(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={enviando || !motivo.trim()}
              onClick={() => void rechazar()}
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TextoDato({ dato: d }: { dato: DatoImportado }) {
  const extra = [
    d.valor && `${d.valor}${d.unidad ? ` ${d.unidad}` : ""}`,
    d.rangoReferencia && `ref. ${d.rangoReferencia}`,
    d.fecha,
    d.gravedad,
    d.detalle,
  ].filter(Boolean)
  return (
    <span className="min-w-0">
      <span className="block font-medium">{d.descripcion}</span>
      {extra.length > 0 && (
        <span className="block text-xs text-muted-foreground">
          {extra.join(" · ")}
        </span>
      )}
      {d.fragmentoOrigen && (
        <span className="block text-xs text-muted-foreground italic">
          «{d.fragmentoOrigen}»
        </span>
      )}
    </span>
  )
}
