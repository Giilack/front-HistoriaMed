import * as React from "react"
import { X } from "lucide-react"

import { Alerta, Campo, Input, Select, Textarea } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiError, api, json } from "@/lib/api"
import { hoyISO } from "@/lib/fechas"
import {
  NOMBRE_GRAVEDAD,
  NOMBRE_TIPO_ALERGIA,
  NOMBRE_TIPO_ANTECEDENTE,
  type CategoriaItem,
  type Cie10,
  type Extraccion,
  type GravedadAlergia,
  type ItemExtraccion,
  type MedicamentoCatalogo,
  type TipoAlergia,
  type TipoAntecedente,
} from "@/lib/types"
import { BuscadorCatalogo } from "@/pages/atencion/BuscadorCatalogo"

/** Los antecedentes que se eligen a mano; los demás tipos salen de las categorías diagnóstico y medicamento. */
const TIPOS_ANTECEDENTE: TipoAntecedente[] = [
  "PERSONAL",
  "FAMILIAR",
  "QUIRURGICO",
  "OTRO",
]

const TITULO: Record<CategoriaItem, string> = {
  ALERGIA: "Alergia",
  DIAGNOSTICO: "Diagnóstico previo",
  MEDICAMENTO: "Medicamento en uso",
  LABORATORIO: "Resultado de laboratorio",
  ANTECEDENTE: "Antecedente",
  OTRO: "Otra información",
}

interface Datos {
  descripcion: string
  detalle: string
  fecha: string
  tipoAlergia: TipoAlergia
  gravedad: GravedadAlergia
  cieCodigo: string
  medicamentoId: number | null
  valor: string
  unidad: string
  rangoReferencia: string
  tipoAntecedente: TipoAntecedente
  fragmentoOrigen: string
  pagina: string
}

function iniciales(item?: ItemExtraccion): Datos {
  return {
    descripcion: item?.descripcion ?? "",
    detalle: item?.detalle ?? "",
    fecha: item?.fecha ?? "",
    tipoAlergia: item?.tipoAlergia ?? "MEDICAMENTO",
    gravedad: item?.gravedad ?? "MODERADA",
    cieCodigo: item?.cieCodigo ?? "",
    medicamentoId: item?.medicamentoId ?? null,
    valor: item?.valor ?? "",
    unidad: item?.unidad ?? "",
    rangoReferencia: item?.rangoReferencia ?? "",
    tipoAntecedente: item?.tipoAntecedente ?? "PERSONAL",
    fragmentoOrigen: item?.fragmentoOrigen ?? "",
    pagina: item?.pagina ? String(item.pagina) : "",
  }
}

/**
 * Agrega o edita un dato de la revisión. Los campos dependen de la categoría; el backend vuelve a validarlos.
 * Sin <form>: se muestra dentro de otros formularios (los formularios HTML no se anidan).
 */
export function FormularioItem({
  extraccionId,
  categoria,
  item,
  alGuardar,
  alCancelar,
}: {
  extraccionId: number
  categoria: CategoriaItem
  /** Si se indica, se edita ese dato; si no, se agrega uno nuevo. */
  item?: ItemExtraccion
  alGuardar: (e: Extraccion) => void
  alCancelar: () => void
}) {
  const [d, setD] = React.useState<Datos>(() => iniciales(item))
  const [error, setError] = React.useState<string | null>(null)
  const [errores, setErrores] = React.useState<Record<string, string>>({})
  const [enviando, setEnviando] = React.useState(false)

  function cambiar<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setD((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar() {
    setError(null)
    setErrores({})
    setEnviando(true)
    const vacio = (v: string) => v.trim() || null
    const cuerpo = {
      categoria,
      descripcion: vacio(d.descripcion),
      detalle: vacio(d.detalle),
      fecha: d.fecha || null,
      tipoAlergia: categoria === "ALERGIA" ? d.tipoAlergia : null,
      gravedad: categoria === "ALERGIA" ? d.gravedad : null,
      cieCodigo: categoria === "DIAGNOSTICO" ? vacio(d.cieCodigo) : null,
      medicamentoId: categoria === "MEDICAMENTO" ? d.medicamentoId : null,
      valor: vacio(d.valor),
      unidad: vacio(d.unidad),
      rangoReferencia: vacio(d.rangoReferencia),
      tipoAntecedente: categoria === "ANTECEDENTE" ? d.tipoAntecedente : null,
      fragmentoOrigen: vacio(d.fragmentoOrigen),
      pagina: d.pagina ? Number(d.pagina) : null,
    }
    try {
      alGuardar(
        await api<Extraccion>(
          `/api/extracciones/${extraccionId}/items${item ? `/${item.id}` : ""}`,
          { method: item ? "PUT" : "POST", ...json(cuerpo) }
        )
      )
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        setErrores(e.errores)
      } else {
        setError("No se pudo guardar el dato")
      }
    } finally {
      setEnviando(false)
    }
  }

  const fecha = (etiqueta: string) => (
    <Campo label={etiqueta} error={errores.fecha}>
      <Input
        type="date"
        max={hoyISO()}
        value={d.fecha}
        onChange={(e) => cambiar("fecha", e.target.value)}
      />
    </Campo>
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-marca/30 bg-marca-claro/30 p-3 dark:bg-muted/40">
      <p className="text-sm font-semibold text-marca-oscuro dark:text-foreground">
        {item ? "Editar" : "Agregar"}: {TITULO[categoria]}
      </p>
      {error && <Alerta>{error}</Alerta>}

      {categoria === "ALERGIA" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Sustancia" error={errores.descripcion}>
            <Input
              autoFocus
              value={d.descripcion}
              maxLength={100}
              placeholder="ej. Penicilina"
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
          </Campo>
          <Campo label="Reacción (opcional)" error={errores.detalle}>
            <Input
              value={d.detalle}
              maxLength={200}
              placeholder="ej. urticaria"
              onChange={(e) => cambiar("detalle", e.target.value)}
            />
          </Campo>
          <Campo label="Tipo" error={errores.tipoAlergia}>
            <Select
              value={d.tipoAlergia}
              onChange={(e) =>
                cambiar("tipoAlergia", e.target.value as TipoAlergia)
              }
            >
              {(Object.keys(NOMBRE_TIPO_ALERGIA) as TipoAlergia[]).map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_ALERGIA[t]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Gravedad" error={errores.gravedad}>
            <Select
              value={d.gravedad}
              onChange={(e) =>
                cambiar("gravedad", e.target.value as GravedadAlergia)
              }
            >
              {(Object.keys(NOMBRE_GRAVEDAD) as GravedadAlergia[]).map((g) => (
                <option key={g} value={g}>
                  {NOMBRE_GRAVEDAD[g]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      )}

      {categoria === "DIAGNOSTICO" && (
        <>
          <Campo label="Diagnóstico (CIE-10)" error={errores.cieCodigo}>
            {d.cieCodigo ? (
              <Elegido
                alQuitar={() => {
                  cambiar("cieCodigo", "")
                  cambiar("descripcion", "")
                }}
              >
                <Badge variant="outline" className="font-mono">
                  {d.cieCodigo}
                </Badge>
                {d.descripcion}
              </Elegido>
            ) : (
              <BuscadorCatalogo<Cie10>
                ruta="/api/cie10"
                placeholder="Busque por código (E11) o nombre (diabetes)…"
                clave={(c) => c.codigo}
                etiqueta={(c) => (
                  <>
                    <span className="font-mono text-marca">{c.codigo}</span>{" "}
                    {c.descripcion}
                  </>
                )}
                alElegir={(c) => {
                  cambiar("cieCodigo", c.codigo)
                  cambiar("descripcion", c.descripcion)
                }}
              />
            )}
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            {fecha("Fecha del diagnóstico (opcional)")}
            <Campo label="Nota (opcional)" error={errores.detalle}>
              <Input
                value={d.detalle}
                maxLength={300}
                placeholder="ej. en tratamiento desde 2020"
                onChange={(e) => cambiar("detalle", e.target.value)}
              />
            </Campo>
          </div>
        </>
      )}

      {categoria === "MEDICAMENTO" && (
        <>
          <Campo label="Medicamento" error={errores.medicamentoId}>
            {d.medicamentoId ? (
              <Elegido
                alQuitar={() => {
                  cambiar("medicamentoId", null)
                  cambiar("descripcion", "")
                }}
              >
                {d.descripcion}
              </Elegido>
            ) : (
              <BuscadorCatalogo<MedicamentoCatalogo>
                ruta="/api/medicamentos"
                placeholder="Busque por nombre (metformina, enalapril)…"
                clave={(m) => m.id}
                etiqueta={(m) => m.descripcion}
                alElegir={(m) => {
                  cambiar("medicamentoId", m.id)
                  cambiar("descripcion", m.descripcion)
                }}
              />
            )}
          </Campo>
          <Campo label="Dosis o pauta (opcional)" error={errores.detalle}>
            <Input
              value={d.detalle}
              maxLength={300}
              placeholder="ej. 1 tableta cada 12 horas"
              onChange={(e) => cambiar("detalle", e.target.value)}
            />
          </Campo>
        </>
      )}

      {categoria === "LABORATORIO" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Examen" error={errores.descripcion}>
              <Input
                autoFocus
                value={d.descripcion}
                maxLength={150}
                placeholder="ej. Hemoglobina"
                onChange={(e) => cambiar("descripcion", e.target.value)}
              />
            </Campo>
            <Campo label="Resultado" error={errores.valor}>
              <Input
                value={d.valor}
                maxLength={60}
                placeholder="ej. 11.2 o Negativo"
                onChange={(e) => cambiar("valor", e.target.value)}
              />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Unidad (opcional)" error={errores.unidad}>
              <Input
                value={d.unidad}
                maxLength={30}
                placeholder="ej. g/dL"
                onChange={(e) => cambiar("unidad", e.target.value)}
              />
            </Campo>
            <Campo
              label="Rango de referencia (opcional)"
              error={errores.rangoReferencia}
            >
              <Input
                value={d.rangoReferencia}
                maxLength={60}
                placeholder="ej. 12 - 16"
                onChange={(e) => cambiar("rangoReferencia", e.target.value)}
              />
            </Campo>
            {fecha("Fecha del examen (opcional)")}
          </div>
        </>
      )}

      {categoria === "ANTECEDENTE" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Tipo" error={errores.tipoAntecedente}>
              <Select
                value={d.tipoAntecedente}
                onChange={(e) =>
                  cambiar("tipoAntecedente", e.target.value as TipoAntecedente)
                }
              >
                {TIPOS_ANTECEDENTE.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO_ANTECEDENTE[t]}
                  </option>
                ))}
              </Select>
            </Campo>
            {fecha("Fecha (opcional)")}
          </div>
          <Campo label="Antecedente" error={errores.descripcion}>
            <Input
              autoFocus
              value={d.descripcion}
              maxLength={300}
              placeholder="ej. Apendicectomía; madre con diabetes"
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
          </Campo>
        </>
      )}

      {categoria === "OTRO" && (
        <Campo label="Información" error={errores.descripcion}>
          <Textarea
            autoFocus
            value={d.descripcion}
            maxLength={300}
            placeholder="Lo que no encaja en las otras categorías. No pasa a la historia clínica: queda en esta revisión."
            onChange={(e) => cambiar("descripcion", e.target.value)}
          />
        </Campo>
      )}

      <details className="text-sm" open={!!(d.fragmentoOrigen || d.pagina)}>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Dónde está en el documento (opcional)
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_6rem]">
          <Campo label="Texto tal como aparece" error={errores.fragmentoOrigen}>
            <Input
              value={d.fragmentoOrigen}
              maxLength={500}
              placeholder="ej. HEMOGLOBINA ........ 11.2 g/dL"
              onChange={(e) => cambiar("fragmentoOrigen", e.target.value)}
            />
          </Campo>
          <Campo label="Página" error={errores.pagina}>
            <Input
              value={d.pagina}
              inputMode="numeric"
              onChange={(e) =>
                cambiar(
                  "pagina",
                  e.target.value
                    .replace(/\D/g, "")
                    .replace(/^0+/, "")
                    .slice(0, 3)
                )
              }
            />
          </Campo>
        </div>
      </details>

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={enviando} onClick={guardar}>
          {enviando ? "Guardando…" : item ? "Guardar cambios" : "Agregar dato"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

/** Elemento elegido de un catálogo, con botón para cambiarlo. */
function Elegido({
  children,
  alQuitar,
}: {
  children: React.ReactNode
  alQuitar: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </span>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label="Cambiar"
        onClick={alQuitar}
      >
        <X />
      </Button>
    </div>
  )
}
