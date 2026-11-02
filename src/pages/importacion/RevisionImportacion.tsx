import * as React from "react"
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, api, json } from "@/lib/api"
import { NOMBRE_TIPO_DOCUMENTO } from "@/lib/types"
import type {
  CategoriaItem,
  DatoImportado,
  DetalleImportacion,
  Importacion,
  ItemExtraccion,
  Sexo,
  TipoDocumento,
} from "@/lib/types"
import { useApi } from "@/lib/useApi"
import { FormularioItem } from "@/pages/extraccion/FormularioItem"

const CATEGORIAS: Record<CategoriaItem, string> = {
  ALERGIA: "Alergias",
  DIAGNOSTICO: "Diagnósticos y consultas anteriores",
  MEDICAMENTO: "Medicamentos",
  ANTECEDENTE: "Antecedentes",
  LABORATORIO: "Laboratorio",
  OTRO: "Otra información (pasa como antecedente)",
}

const ORDEN = Object.keys(CATEGORIAS) as CategoriaItem[]

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

/** Un dato de la revisión. origen es su posición en lo que propuso la IA; null si lo agregó Admisión. */
interface Fila {
  clave: number
  origen: number | null
  incluido: boolean
  dato: DatoImportado
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

/** Mismas reglas del backend, para decir qué falta antes de enviar. */
function erroresPaciente(f: Datos) {
  const e: Partial<Record<keyof Datos, string>> = {}
  if (!f.nombres.trim()) e.nombres = "Escriba los nombres"
  if (!f.apellidoPaterno.trim())
    e.apellidoPaterno = "Escriba el apellido paterno"
  if (!f.fechaNacimiento) e.fechaNacimiento = "Indique la fecha de nacimiento"
  if (!f.sexo) e.sexo = "Seleccione el sexo"
  const numero = f.numeroDocumento.trim()
  if (f.tipoDocumento !== "SIN_DOCUMENTO" && !numero) {
    e.numeroDocumento = "Escriba el número, o elija «sin documento»"
  } else if (f.tipoDocumento === "DNI" && !/^\d{8}$/.test(numero)) {
    e.numeroDocumento = "El DNI tiene 8 dígitos"
  }
  if (f.telefono.trim() && !/^[0-9+ ]{6,15}$/.test(f.telefono.trim())) {
    e.telefono = "Entre 6 y 15 dígitos"
  }
  return e
}

/** Qué le falta a un dato para pasar a la historia. */
function faltaDelDato(d: DatoImportado) {
  if (d.categoria === "DIAGNOSTICO" && !d.cieCodigo) {
    return "Elija el diagnóstico del catálogo"
  }
  if (d.categoria === "MEDICAMENTO" && !d.medicamentoId) {
    return "Elija el medicamento del catálogo"
  }
  if (d.categoria === "LABORATORIO" && !d.valor) return "Falta el resultado"
  if (d.categoria === "ALERGIA" && (!d.tipoAlergia || !d.gravedad)) {
    return "Falta el tipo o la gravedad"
  }
  if (d.categoria === "ANTECEDENTE" && !d.tipoAntecedente) {
    return "Falta el tipo de antecedente"
  }
  return null
}

/** Revisión de un documento importado: el PDF al lado de lo que propuso la IA. Admisión compara, corrige y decide. */
export function RevisionImportacion({
  id,
  alTerminar,
  alSiguiente,
}: {
  id: number
  alTerminar: () => void
  alSiguiente: (id: number) => void
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
          <Formulario
            id={id}
            detalle={detalle}
            alTerminar={alTerminar}
            alSiguiente={alSiguiente}
          />
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
      className="h-[70vh] w-full rounded-lg border lg:sticky lg:top-16 lg:h-[80vh]"
    />
  )
}

function Formulario({
  id,
  detalle,
  alTerminar,
  alSiguiente,
}: {
  id: number
  detalle: DetalleImportacion
  alTerminar: () => void
  alSiguiente: (id: number) => void
}) {
  const { confirmar } = useConfirmacion()
  const [f, setF] = React.useState<Datos>(() => datosIniciales(detalle))
  const [filas, setFilas] = React.useState<Fila[]>(() =>
    detalle.datos.map((dato, i) => ({
      clave: i,
      origen: i,
      incluido: true,
      dato,
    }))
  )
  const siguienteClave = React.useRef(detalle.datos.length)
  const [editando, setEditando] = React.useState<number | null>(null)
  const [agregando, setAgregando] = React.useState<CategoriaItem | null>(null)
  const [confirmado, setConfirmado] = React.useState(false)
  const [unPaciente, setUnPaciente] = React.useState(false)
  const [destino, setDestino] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [erroresServidor, setErroresServidor] = React.useState<
    Record<string, string>
  >({})
  const [enviando, setEnviando] = React.useState(false)

  const e = detalle.existente
  const dudosa = e !== null && !e.coincideNombre
  const hayParecidos = detalle.parecidos.length > 0
  const errores = { ...erroresServidor, ...erroresPaciente(f) }
  const cambiar = (c: Partial<Datos>) => {
    setF((v) => ({ ...v, ...c }))
    setErroresServidor({})
  }

  const incluidas = filas.filter((x) => x.incluido)
  const conFalta = incluidas.filter((x) => faltaDelDato(x.dato))
  const faltan = [
    ...Object.values(errores),
    ...conFalta.map(
      (x) => `«${x.dato.descripcion ?? "Dato"}»: ${faltaDelDato(x.dato)}`
    ),
    ...(dudosa && !confirmado
      ? ["Confirme que es la misma persona registrada"]
      : []),
    ...(hayParecidos && !destino
      ? ["Indique si es uno de los pacientes parecidos o una persona nueva"]
      : []),
    ...(detalle.variosPacientes && !unPaciente
      ? ["Confirme que el documento es de un solo paciente"]
      : []),
  ]

  async function aprobar(seguir: boolean) {
    setError(null)
    setErroresServidor({})
    setEnviando(true)
    try {
      const r = await api<{
        numeroHc: string
        pacienteNuevo: boolean
        datosRegistrados: number
        datosCorregidos: number
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
          datos: incluidas.map((x) => ({ origen: x.origen, dato: x.dato })),
          pacienteId: destino && destino !== "NUEVO" ? Number(destino) : null,
          confirmarCoincidencia: confirmado || destino !== "",
          confirmarUnPaciente: unPaciente,
        }),
      })
      toast.success(
        r.pacienteNuevo
          ? "Paciente registrado con su historia"
          : "Historia agregada al paciente",
        {
          description: `${r.numeroHc} · ${r.datosRegistrados} dato(s), ${r.datosCorregidos} corregido(s)`,
        }
      )
      const lista = seguir ? await api<Importacion[]>("/api/importaciones") : []
      const siguiente = lista
        .filter((i) => i.estado === "LISTA" && i.id !== id)
        .sort((a, b) => a.id - b.id)[0]
      if (siguiente) alSiguiente(siguiente.id)
      else alTerminar()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErroresServidor(
          Object.fromEntries(
            Object.entries(err.errores).map(([k, v]) => [
              k.replace("paciente.", ""),
              v,
            ])
          )
        )
      } else {
        setError("No se pudo aprobar")
      }
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar() {
    const si = await confirmar({
      titulo: "¿Eliminar este documento?",
      descripcion:
        "El archivo y los datos extraídos se borran. Nada pasó a la historia clínica.",
      accion: "Sí, eliminar",
      destructivo: true,
    })
    if (!si) return
    setEnviando(true)
    try {
      await api(`/api/importaciones/${id}`, { method: "DELETE" })
      toast.success("Documento eliminado")
      alTerminar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar")
      setEnviando(false)
    }
  }

  const campo = (
    etiqueta: string,
    nombre: keyof Datos,
    control: React.ReactNode
  ) => (
    <Campo label={etiqueta} error={errores[nombre]}>
      {control}
    </Campo>
  )
  const texto = (nombre: Exclude<keyof Datos, "sexo" | "tipoDocumento">) => (
    <Input
      value={f[nombre]}
      aria-invalid={errores[nombre] ? true : undefined}
      onChange={(x) => cambiar({ [nombre]: x.target.value })}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      {detalle.variosPacientes && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span className="flex items-start gap-2 font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Este documento parece tener a más de un paciente. Lo correcto es
            eliminarlo y subir cada historia por separado.
          </span>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={unPaciente}
              onCheckedChange={(v) => setUnPaciente(v === true)}
            />
            Revisé el documento y es de un solo paciente
          </label>
        </div>
      )}
      {detalle.datosOmitidos > 0 && (
        <Alerta>
          El documento tiene {detalle.datosOmitidos} dato(s) más de los que la
          IA puede proponer. Agréguelos a mano antes de aprobar.
        </Alerta>
      )}

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
                  checked={confirmado}
                  onCheckedChange={(v) => setConfirmado(v === true)}
                />
                Confirmo que es la misma persona
              </label>
            </div>
          )}
          {hayParecidos && (
            <Campo label="Hay pacientes parecidos: mismo apellido y fecha de nacimiento">
              <Select
                value={destino}
                onChange={(x) => setDestino(x.target.value)}
              >
                <option value="" disabled>
                  Seleccione…
                </option>
                {detalle.parecidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    Es {p.nombreCompleto} ({p.numeroHc})
                  </option>
                ))}
                <option value="NUEVO">Es otra persona: registrar nuevo</option>
              </Select>
            </Campo>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {campo(
              "Tipo de documento",
              "tipoDocumento",
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
            )}
            {campo(
              "Número de documento",
              "numeroDocumento",
              texto("numeroDocumento")
            )}
            {campo("Nombres", "nombres", texto("nombres"))}
            {campo(
              "Apellido paterno",
              "apellidoPaterno",
              texto("apellidoPaterno")
            )}
            {campo(
              "Apellido materno",
              "apellidoMaterno",
              texto("apellidoMaterno")
            )}
            {campo(
              "Fecha de nacimiento",
              "fechaNacimiento",
              <Input
                type="date"
                value={f.fechaNacimiento}
                aria-invalid={errores.fechaNacimiento ? true : undefined}
                onChange={(x) => cambiar({ fechaNacimiento: x.target.value })}
              />
            )}
            {campo(
              "Sexo",
              "sexo",
              <Select
                value={f.sexo}
                aria-invalid={errores.sexo ? true : undefined}
                onChange={(x) => cambiar({ sexo: x.target.value as Sexo })}
              >
                <option value="" disabled>
                  Seleccione…
                </option>
                <option value="FEMENINO">Femenino</option>
                <option value="MASCULINO">Masculino</option>
              </Select>
            )}
            {campo("Teléfono", "telefono", texto("telefono"))}
          </div>
          {campo("Dirección", "direccion", texto("direccion"))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos para la historia</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Compare cada dato con el documento. Corrija lo que esté mal,
            desmarque lo que no corresponda y agregue lo que falte.
          </p>
          {ORDEN.map((c) => {
            const delGrupo = filas.filter((x) => x.dato.categoria === c)
            return (
              <fieldset key={c} className="flex flex-col gap-2">
                <legend className="text-sm font-medium">{CATEGORIAS[c]}</legend>
                {delGrupo.map((x) =>
                  editando === x.clave ? (
                    <FormularioItem
                      key={x.clave}
                      categoria={c}
                      item={x.dato as unknown as ItemExtraccion}
                      alConfirmar={(dato) => {
                        setFilas((v) =>
                          v.map((y) =>
                            y.clave === x.clave ? { ...y, dato } : y
                          )
                        )
                        setEditando(null)
                      }}
                      alCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <div
                      key={x.clave}
                      className="flex items-start gap-2 rounded-md border p-2 text-sm"
                    >
                      <label className="flex min-w-0 flex-1 items-start gap-2">
                        <Checkbox
                          className="mt-0.5"
                          checked={x.incluido}
                          onCheckedChange={(v) =>
                            setFilas((l) =>
                              l.map((y) =>
                                y.clave === x.clave
                                  ? { ...y, incluido: v === true }
                                  : y
                              )
                            )
                          }
                        />
                        <TextoDato dato={x.dato} incluido={x.incluido} />
                      </label>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Editar ${x.dato.descripcion ?? "dato"}`}
                        onClick={() => {
                          setAgregando(null)
                          setEditando(x.clave)
                        }}
                      >
                        <Pencil />
                      </Button>
                      {x.origen === null && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Quitar ${x.dato.descripcion ?? "dato"}`}
                          onClick={() =>
                            setFilas((l) =>
                              l.filter((y) => y.clave !== x.clave)
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  )
                )}
                {agregando === c ? (
                  <FormularioItem
                    categoria={c}
                    alConfirmar={(dato) => {
                      const clave = siguienteClave.current++
                      setFilas((v) => [
                        ...v,
                        { clave, origen: null, incluido: true, dato },
                      ])
                      setAgregando(null)
                    }}
                    alCancelar={() => setAgregando(null)}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start"
                    aria-label={`Agregar a ${CATEGORIAS[c]}`}
                    onClick={() => {
                      setEditando(null)
                      setAgregando(c)
                    }}
                  >
                    <Plus />
                    Agregar
                  </Button>
                )}
              </fieldset>
            )
          })}
        </CardContent>
      </Card>

      {faltan.length > 0 && (
        <Alerta tipo="info">
          <p className="font-medium">Para aprobar falta:</p>
          <ul className="list-disc pl-4">
            {faltan.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Alerta>
      )}
      {error && <Alerta>{error}</Alerta>}
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="ghost"
          disabled={enviando}
          onClick={() => void eliminar()}
        >
          <Trash2 />
          Eliminar documento
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={enviando || faltan.length > 0}
            onClick={() => void aprobar(false)}
          >
            Aprobar ({incluidas.length} datos)
          </Button>
          <Button
            disabled={enviando || faltan.length > 0}
            onClick={() => void aprobar(true)}
          >
            {enviando ? "Aprobando…" : "Aprobar y seguir"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TextoDato({
  dato: d,
  incluido,
}: {
  dato: DatoImportado
  incluido: boolean
}) {
  const extra = [
    d.valor && `${d.valor}${d.unidad ? ` ${d.unidad}` : ""}`,
    d.rangoReferencia && `ref. ${d.rangoReferencia}`,
    d.fecha,
    d.gravedad,
    d.detalle,
  ].filter(Boolean)
  const falta = incluido ? faltaDelDato(d) : null
  return (
    <span className={incluido ? "min-w-0" : "min-w-0 opacity-60"}>
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
      {falta && (
        <span className="block text-xs font-medium text-destructive">
          {falta}
        </span>
      )}
    </span>
  )
}
