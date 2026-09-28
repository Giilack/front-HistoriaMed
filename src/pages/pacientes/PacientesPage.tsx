import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { Alerta, Input } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  NOMBRE_FINANCIAMIENTO,
  type Pagina,
  type PacienteResumen,
} from "@/lib/types"
import { useApi, useDebounce } from "@/lib/useApi"

import { EstadoSeguroEtiqueta, FichaPaciente } from "./FichaPaciente"
import { FormularioPaciente } from "./FormularioPaciente"

type Vista =
  | { tipo: "busqueda" }
  | { tipo: "nuevo" }
  | { tipo: "ficha"; id: number; mensaje?: string }

/**
 * Búsqueda de pacientes, registro (ADMISION) y ficha. Reglas en plan.md, secciones 5.1 y 5.2.
 */
export function PacientesPage() {
  const { usuario } = useAuth()
  const puedeRegistrar = usuario?.rol === "ADMISION"
  const [vista, setVista] = React.useState<Vista>({ tipo: "busqueda" })
  // La búsqueda vive aquí para conservarla al volver desde una ficha
  const [texto, setTexto] = React.useState("")
  const [numPagina, setNumPagina] = React.useState(0)

  if (vista.tipo === "nuevo") {
    return (
      <FormularioPaciente
        alGuardar={(p) =>
          setVista({
            tipo: "ficha",
            id: p.id,
            mensaje: `Paciente registrado con historia clínica ${p.numeroHc}.`,
          })
        }
        alCancelar={() => setVista({ tipo: "busqueda" })}
      />
    )
  }
  if (vista.tipo === "ficha") {
    return (
      <FichaPaciente
        key={vista.id}
        id={vista.id}
        mensajeInicial={vista.mensaje}
        alVolver={() => setVista({ tipo: "busqueda" })}
      />
    )
  }
  return (
    <Busqueda
      texto={texto}
      setTexto={(t) => {
        setTexto(t)
        setNumPagina(0)
      }}
      numPagina={numPagina}
      setNumPagina={setNumPagina}
      puedeRegistrar={puedeRegistrar}
      alNuevo={() => setVista({ tipo: "nuevo" })}
      alAbrir={(id) => setVista({ tipo: "ficha", id })}
    />
  )
}

function Busqueda({
  texto,
  setTexto,
  numPagina,
  setNumPagina,
  puedeRegistrar,
  alNuevo,
  alAbrir,
}: {
  texto: string
  setTexto: (t: string) => void
  numPagina: number
  setNumPagina: (n: number) => void
  puedeRegistrar: boolean
  alNuevo: () => void
  alAbrir: (id: number) => void
}) {
  const q = useDebounce(texto.trim())
  const params = new URLSearchParams({ page: String(numPagina), size: "15" })
  if (q) params.set("q", q)
  const { datos: pagina, error } = useApi<Pagina<PacienteResumen>>(
    `/api/pacientes?${params}`
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        {puedeRegistrar && (
          <Button onClick={alNuevo}>Registrar paciente</Button>
        )}
      </div>

      <Input
        autoFocus
        className="max-w-md"
        placeholder="Buscar por DNI, N.º de HC (HC-000012) o nombres y apellidos"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      {error && <Alerta>{error}</Alerta>}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">HC</th>
              <th className="px-3 py-2 font-medium">Paciente</th>
              <th className="px-3 py-2 font-medium">Documento</th>
              <th className="px-3 py-2 font-medium">Edad</th>
              <th className="px-3 py-2 font-medium">Financiamiento</th>
            </tr>
          </thead>
          <tbody>
            {pagina?.contenido.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-t hover:bg-muted/50"
                onClick={() => alAbrir(p.id)}
                onKeyDown={(e) => e.key === "Enter" && alAbrir(p.id)}
                tabIndex={0}
              >
                <td className="px-3 py-2 font-mono">{p.numeroHc}</td>
                <td className="px-3 py-2 font-medium">{p.nombreCompleto}</td>
                <td className="px-3 py-2">
                  {p.numeroDocumento ?? (
                    <span className="text-muted-foreground">Sin documento</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {p.edad} · {p.sexo === "FEMENINO" ? "F" : "M"}
                </td>
                <td className="px-3 py-2">
                  {NOMBRE_FINANCIAMIENTO[p.tipoFinanciamiento]}
                  {p.estadoSeguro && (
                    <>
                      {" · "}
                      <EstadoSeguroEtiqueta estado={p.estadoSeguro} />
                    </>
                  )}
                </td>
              </tr>
            ))}
            {pagina?.contenido.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {q ? (
                    <>
                      No se encontraron pacientes para «{q}».
                      {puedeRegistrar && (
                        <>
                          {" "}
                          <Button
                            variant="link"
                            className="h-auto p-0"
                            onClick={alNuevo}
                          >
                            Registrar un paciente nuevo
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    "Aún no hay pacientes registrados."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagina && pagina.totalPaginas > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={numPagina === 0}
            onClick={() => setNumPagina(numPagina - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {pagina.pagina + 1} de {pagina.totalPaginas} (
            {pagina.totalElementos} pacientes)
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={numPagina + 1 >= pagina.totalPaginas}
            onClick={() => setNumPagina(numPagina + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
