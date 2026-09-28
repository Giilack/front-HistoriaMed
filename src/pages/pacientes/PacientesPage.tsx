import * as React from "react"
import { ChevronRight, Search, UserPlus, UsersRound } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthContext"
import { Alerta, Input } from "@/components/form"
import {
  AvatarIniciales,
  EncabezadoPagina,
  EstadoVacio,
  Paginacion,
} from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  NOMBRE_FINANCIAMIENTO,
  NOMBRE_TIPO_DOCUMENTO,
  type Pagina,
  type PacienteResumen,
} from "@/lib/types"
import { useApi, useDebounce } from "@/lib/useApi"

import { EstadoSeguroEtiqueta, FichaPaciente } from "./FichaPaciente"
import { FormularioPaciente } from "./FormularioPaciente"

type Vista =
  { tipo: "busqueda" } | { tipo: "nuevo" } | { tipo: "ficha"; id: number }

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
        alGuardar={(p) => {
          toast.success("Paciente registrado", {
            description: `Historia clínica ${p.numeroHc}`,
          })
          setVista({ tipo: "ficha", id: p.id })
        }}
        alCancelar={() => setVista({ tipo: "busqueda" })}
      />
    )
  }
  if (vista.tipo === "ficha") {
    return (
      <FichaPaciente
        key={vista.id}
        id={vista.id}
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
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Pacientes"
        descripcion="Busque por DNI, número de historia clínica o nombres y apellidos."
        acciones={
          puedeRegistrar && (
            <Button onClick={alNuevo}>
              <UserPlus />
              Registrar paciente
            </Button>
          )
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              className="pl-9"
              placeholder="Ej. 45678912, HC-000012 o Rosa Quispe"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Buscar paciente"
            />
          </div>
        </div>

        {error && (
          <div className="p-4">
            <Alerta>{error}</Alerta>
          </div>
        )}

        {pagina?.contenido.length === 0 ? (
          <EstadoVacio
            icono={UsersRound}
            titulo={
              q
                ? `No se encontraron pacientes para «${q}»`
                : "Aún no hay pacientes registrados"
            }
            descripcion={
              q
                ? "Revise el número o pruebe con otra parte del nombre."
                : undefined
            }
          >
            {puedeRegistrar && (
              <Button variant="outline" onClick={alNuevo}>
                <UserPlus />
                Registrar paciente nuevo
              </Button>
            )}
          </EstadoVacio>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Paciente</TableHead>
                <TableHead>Historia clínica</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Financiamiento</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pagina
                ? [0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : pagina.contenido.map((p) => (
                    <TableRow
                      key={p.id}
                      className="group cursor-pointer"
                      onClick={() => alAbrir(p.id)}
                      onKeyDown={(e) => e.key === "Enter" && alAbrir(p.id)}
                      tabIndex={0}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <AvatarIniciales nombre={p.nombreCompleto} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {p.nombreCompleto}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.numeroDocumento
                                ? `${NOMBRE_TIPO_DOCUMENTO[p.tipoDocumento]} ${p.numeroDocumento}`
                                : "Sin documento"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {p.numeroHc}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.edad} · {p.sexo === "FEMENINO" ? "F" : "M"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">
                            {NOMBRE_FINANCIAMIENTO[p.tipoFinanciamiento]}
                          </Badge>
                          {p.estadoSeguro && (
                            <EstadoSeguroEtiqueta estado={p.estadoSeguro} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-marca" />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}

        {pagina && (
          <Paginacion
            pagina={pagina.pagina}
            totalPaginas={pagina.totalPaginas}
            totalElementos={pagina.totalElementos}
            unidad="pacientes"
            alCambiar={setNumPagina}
          />
        )}
      </Card>
    </div>
  )
}
