import * as React from "react"
import {
  Activity,
  ClipboardList,
  Copy,
  EllipsisVertical,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  UserRoundX,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthContext"
import { useConfirmacion } from "@/components/Confirmacion"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { EncabezadoPagina, EstadoVacio, Paginacion } from "@/components/pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, api, json } from "@/lib/api"
import { useApi } from "@/lib/useApi"
import {
  NOMBRE_ROL,
  ROLES,
  type Pagina,
  type PasswordTemporalResponse,
  type Rol,
  type Usuario,
} from "@/lib/types"
import { cn } from "@/lib/utils"

interface DatosUsuario {
  username: string
  nombres: string
  apellidos: string
  dni: string
  email: string
  rol: Rol
  cmp: string
}

const VACIO: DatosUsuario = {
  username: "",
  nombres: "",
  apellidos: "",
  dni: "",
  email: "",
  rol: "ADMISION",
  cmp: "",
}

const ICONO_ROL: Record<Rol, LucideIcon> = {
  ADMIN: ShieldCheck,
  ADMISION: ClipboardList,
  TRIAJE: Activity,
  MEDICO: Stethoscope,
}

/** null = formulario cerrado; "nuevo" = crear; Usuario = editar ese usuario */
type Edicion = null | "nuevo" | Usuario

export function UsuariosPage() {
  const { usuario: actual } = useAuth()
  const [numPagina, setNumPagina] = React.useState(0)
  const [texto, setTexto] = React.useState("")
  const [rol, setRol] = React.useState("")
  const [activo, setActivo] = React.useState("")
  const [edicion, setEdicion] = React.useState<Edicion>(null)
  const [errorAccion, setError] = React.useState<string | null>(null)
  // Contraseña temporal recién generada: se muestra una sola vez
  const [temporal, setTemporal] =
    React.useState<PasswordTemporalResponse | null>(null)

  const params = new URLSearchParams({ page: String(numPagina), size: "10" })
  if (texto.trim()) params.set("texto", texto.trim())
  if (rol) params.set("rol", rol)
  if (activo) params.set("activo", activo)
  const {
    datos: pagina,
    error: errorCarga,
    recargar: cargar,
  } = useApi<Pagina<Usuario>>(`/api/usuarios?${params}`)
  const error = errorAccion ?? errorCarga
  const { confirmar } = useConfirmacion()

  async function accion(
    u: Usuario,
    tipo: "activar" | "desactivar" | "resetear"
  ) {
    const confirmaciones = {
      desactivar: {
        titulo: `¿Desactivar a ${u.username}?`,
        descripcion:
          "No podrá ingresar al sistema. Sus registros se conservan.",
        accion: "Desactivar",
        destructivo: true,
      },
      activar: { titulo: `¿Reactivar a ${u.username}?`, accion: "Reactivar" },
      resetear: {
        titulo: `¿Generar una contraseña temporal para ${u.username}?`,
        descripcion:
          "Se cerrarán sus sesiones abiertas y deberá cambiarla al ingresar.",
        accion: "Generar contraseña",
      },
    }
    if (!(await confirmar(confirmaciones[tipo]))) return
    setError(null)
    try {
      if (tipo === "resetear") {
        setTemporal(
          await api<PasswordTemporalResponse>(
            `/api/usuarios/${u.id}/resetear-password`,
            {
              method: "POST",
            }
          )
        )
      } else {
        await api(`/api/usuarios/${u.id}/${tipo}`, { method: "PATCH" })
        toast.success(
          tipo === "activar"
            ? `${u.username} reactivado`
            : `${u.username} desactivado`
        )
      }
      cargar()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  function filtro<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v)
      setNumPagina(0)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Cuentas del personal y su rol. Los usuarios se desactivan, no se borran."
        acciones={
          <Button onClick={() => setEdicion("nuevo")}>
            <UserPlus />
            Nuevo usuario
          </Button>
        }
      />

      {error && <Alerta>{error}</Alerta>}

      {temporal && (
        <DialogoPasswordTemporal
          temporal={temporal}
          alCerrar={() => setTemporal(null)}
        />
      )}

      {edicion && (
        <FormularioUsuario
          edicion={edicion}
          alCancelar={() => setEdicion(null)}
          alGuardar={(resultado) => {
            if (edicion !== "nuevo")
              toast.success(`Datos de ${edicion.username} actualizados`)
            setEdicion(null)
            if (resultado) setTemporal(resultado)
            cargar()
          }}
        />
      )}

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap gap-2 border-b p-4">
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Buscar por nombre, usuario o DNI"
              className="pl-9"
              aria-label="Buscar usuario"
              value={texto}
              onChange={(e) => filtro(setTexto)(e.target.value)}
            />
          </div>
          <Select
            className="w-44"
            aria-label="Filtrar por rol"
            value={rol}
            onChange={(e) => filtro(setRol)(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            aria-label="Filtrar por estado"
            value={activo}
            onChange={(e) => filtro(setActivo)(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </Select>
        </div>

        {pagina?.contenido.length === 0 ? (
          <EstadoVacio
            icono={UsersRound}
            titulo="No hay usuarios con esos filtros"
            descripcion="Pruebe con otro nombre, rol o estado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Usuario</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pagina
                ? [0, 1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : pagina.contenido.map((u) => {
                    const IconoRol = ICONO_ROL[u.rol]
                    return (
                      <TableRow
                        key={u.id}
                        className={cn(!u.activo && "opacity-60")}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {u.apellidos}, {u.nombres}
                                {u.id === actual?.id && (
                                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                    (usted)
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {u.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {u.dni}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-0.5">
                            <Badge variant="secondary">
                              <IconoRol />
                              {NOMBRE_ROL[u.rol]}
                            </Badge>
                            {u.cmp && (
                              <span className="text-xs text-muted-foreground">
                                CMP {u.cmp}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Estado usuario={u} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEdicion(u)}
                            >
                              <Pencil />
                              Editar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Más acciones para ${u.username}`}
                                  />
                                }
                              >
                                <EllipsisVertical />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="min-w-52"
                              >
                                <DropdownMenuItem
                                  onClick={() => accion(u, "resetear")}
                                >
                                  <KeyRound />
                                  Resetear contraseña
                                </DropdownMenuItem>
                                {u.id !== actual?.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {u.activo ? (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => accion(u, "desactivar")}
                                      >
                                        <UserRoundX />
                                        Desactivar
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => accion(u, "activar")}
                                      >
                                        <UserCheck />
                                        Reactivar
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        )}

        {pagina && (
          <Paginacion
            pagina={pagina.pagina}
            totalPaginas={pagina.totalPaginas}
            totalElementos={pagina.totalElementos}
            unidad="usuarios"
            alCambiar={setNumPagina}
          />
        )}
      </Card>
    </div>
  )
}

const ESTILO_ESTADO = {
  inactivo: { texto: "Inactivo", clase: "bg-muted text-muted-foreground" },
  bloqueado: {
    texto: "Bloqueado",
    clase: "bg-destructive/12 text-destructive",
  },
  temporal: {
    texto: "Contraseña temporal",
    clase: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  },
  activo: {
    texto: "Activo",
    clase: "bg-green-600/12 text-green-700 dark:text-green-400",
  },
}

function Estado({ usuario }: { usuario: Usuario }) {
  const e = !usuario.activo
    ? ESTILO_ESTADO.inactivo
    : usuario.bloqueado
      ? ESTILO_ESTADO.bloqueado
      : usuario.debeCambiarPassword
        ? ESTILO_ESTADO.temporal
        : ESTILO_ESTADO.activo
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

/** La contraseña temporal se muestra una sola vez: el backend no la guarda en claro. */
function DialogoPasswordTemporal({
  temporal,
  alCerrar,
}: {
  temporal: PasswordTemporalResponse
  alCerrar: () => void
}) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(temporal.passwordTemporal)
      toast.success("Contraseña copiada")
    } catch {
      toast.error("No se pudo copiar; anótela manualmente")
    }
  }

  return (
    // Solo se cierra con el botón, para que no se pierda por un clic fuera
    <Dialog open onOpenChange={() => undefined} disablePointerDismissal>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-marca" aria-hidden />
            Contraseña temporal de {temporal.usuario.username}
          </DialogTitle>
          <DialogDescription>
            Entréguela al usuario: no se volverá a mostrar. Deberá cambiarla al
            ingresar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-marca-claro/50 p-3 dark:bg-muted">
          <code className="flex-1 font-mono text-lg font-semibold tracking-wider select-all">
            {temporal.passwordTemporal}
          </code>
          <Button size="sm" variant="outline" onClick={copiar}>
            <Copy />
            Copiar
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={alCerrar}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormularioUsuario({
  edicion,
  alCancelar,
  alGuardar,
}: {
  edicion: "nuevo" | Usuario
  alCancelar: () => void
  alGuardar: (resultado: PasswordTemporalResponse | null) => void
}) {
  const esNuevo = edicion === "nuevo"
  const [datos, setDatos] = React.useState<DatosUsuario>(() =>
    esNuevo
      ? VACIO
      : {
          username: edicion.username,
          nombres: edicion.nombres,
          apellidos: edicion.apellidos,
          dni: edicion.dni,
          email: edicion.email ?? "",
          rol: edicion.rol,
          cmp: edicion.cmp ?? "",
        }
  )
  const [error, setError] = React.useState<string | null>(null)
  const [errores, setErrores] = React.useState<Record<string, string>>({})
  const [enviando, setEnviando] = React.useState(false)

  function cambiar<K extends keyof DatosUsuario>(
    campo: K,
    valor: DatosUsuario[K]
  ) {
    setDatos((d) => ({ ...d, [campo]: valor }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setErrores({})
    setEnviando(true)
    const cuerpo = {
      ...datos,
      email: datos.email.trim() || null,
      cmp: datos.rol === "MEDICO" ? datos.cmp.trim() || null : null,
    }
    try {
      if (esNuevo) {
        alGuardar(
          await api<PasswordTemporalResponse>("/api/usuarios", {
            method: "POST",
            ...json(cuerpo),
          })
        )
      } else {
        await api(`/api/usuarios/${edicion.id}`, {
          method: "PUT",
          ...json(cuerpo),
        })
        alGuardar(null)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrores(err.errores)
      } else {
        setError("No se pudo guardar")
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && alCancelar()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esNuevo ? "Nuevo usuario" : `Editar ${edicion.username}`}
          </DialogTitle>
          <DialogDescription>
            {esNuevo
              ? "El sistema generará una contraseña temporal que se mostrará una sola vez."
              : "El nombre de usuario no se puede cambiar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {error && <Alerta>{error}</Alerta>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Usuario" error={errores.username}>
              <Input
                value={datos.username}
                onChange={(e) =>
                  cambiar("username", e.target.value.toLowerCase())
                }
                disabled={!esNuevo}
                placeholder="ej. mlopez"
                required
              />
            </Campo>
            <Campo label="DNI" error={errores.dni}>
              <Input
                value={datos.dni}
                onChange={(e) =>
                  cambiar("dni", e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                inputMode="numeric"
                required
              />
            </Campo>
            <Campo label="Nombres" error={errores.nombres}>
              <Input
                value={datos.nombres}
                onChange={(e) => cambiar("nombres", e.target.value)}
                required
              />
            </Campo>
            <Campo label="Apellidos" error={errores.apellidos}>
              <Input
                value={datos.apellidos}
                onChange={(e) => cambiar("apellidos", e.target.value)}
                required
              />
            </Campo>
            <Campo label="Email (opcional)" error={errores.email}>
              <Input
                type="email"
                value={datos.email}
                onChange={(e) => cambiar("email", e.target.value)}
              />
            </Campo>
            <Campo label="Rol" error={errores.rol}>
              <Select
                value={datos.rol}
                onChange={(e) => cambiar("rol", e.target.value as Rol)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </Select>
            </Campo>
            {datos.rol === "MEDICO" && (
              <Campo label="CMP (colegiatura)" error={errores.cmp}>
                <Input
                  value={datos.cmp}
                  onChange={(e) =>
                    cambiar(
                      "cmp",
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  inputMode="numeric"
                  required
                />
              </Campo>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
