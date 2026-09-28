import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  async function accion(
    u: Usuario,
    tipo: "activar" | "desactivar" | "resetear"
  ) {
    const confirmaciones = {
      desactivar: `¿Desactivar a ${u.username}? No podrá ingresar al sistema.`,
      activar: `¿Reactivar a ${u.username}?`,
      resetear: `¿Generar una nueva contraseña temporal para ${u.username}? Se cerrarán sus sesiones.`,
    }
    if (!window.confirm(confirmaciones[tipo])) return
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
      }
      cargar()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la acción"
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={() => setEdicion("nuevo")}>Nuevo usuario</Button>
      </div>

      {error && <Alerta>{error}</Alerta>}

      {temporal && (
        <Alerta tipo="exito">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Contraseña temporal de <b>{temporal.usuario.username}</b>:{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-base">
                {temporal.passwordTemporal}
              </code>{" "}
              — entréguela al usuario; no se volverá a mostrar. Deberá cambiarla
              al ingresar.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTemporal(null)}
            >
              Entendido
            </Button>
          </div>
        </Alerta>
      )}

      {edicion && (
        <FormularioUsuario
          edicion={edicion}
          alCancelar={() => setEdicion(null)}
          alGuardar={(resultado) => {
            setEdicion(null)
            if (resultado) setTemporal(resultado)
            cargar()
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nombre, usuario o DNI"
          className="max-w-xs"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setNumPagina(0)
          }}
        />
        <Select
          className="w-40"
          value={rol}
          onChange={(e) => {
            setRol(e.target.value)
            setNumPagina(0)
          }}
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
          value={activo}
          onChange={(e) => {
            setActivo(e.target.value)
            setNumPagina(0)
          }}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">DNI</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagina?.contenido.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 font-mono">{u.username}</td>
                <td className="px-3 py-2">
                  {u.apellidos}, {u.nombres}
                </td>
                <td className="px-3 py-2">{u.dni}</td>
                <td className="px-3 py-2">
                  {NOMBRE_ROL[u.rol]}
                  {u.cmp && (
                    <span className="text-muted-foreground">
                      {" "}
                      · CMP {u.cmp}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Estado usuario={u} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setEdicion(u)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => accion(u, "resetear")}
                    >
                      Resetear contraseña
                    </Button>
                    {u.id !== actual?.id &&
                      (u.activo ? (
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => accion(u, "desactivar")}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => accion(u, "activar")}
                        >
                          Activar
                        </Button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
            {pagina?.contenido.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay usuarios con esos filtros.
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
            onClick={() => setNumPagina((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {pagina.pagina + 1} de {pagina.totalPaginas}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={numPagina + 1 >= pagina.totalPaginas}
            onClick={() => setNumPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

function Estado({ usuario }: { usuario: Usuario }) {
  if (!usuario.activo)
    return <span className="text-muted-foreground">Inactivo</span>
  if (usuario.bloqueado)
    return <span className="text-destructive">Bloqueado</span>
  if (usuario.debeCambiarPassword)
    return <span className="text-amber-600">Contraseña temporal</span>
  return <span className="text-green-700 dark:text-green-400">Activo</span>
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
    <Card>
      <CardHeader>
        <CardTitle>
          {esNuevo ? "Nuevo usuario" : `Editar ${edicion.username}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {error && <Alerta>{error}</Alerta>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {esNuevo && (
            <p className="text-sm text-muted-foreground">
              El sistema generará una contraseña temporal que se mostrará una
              sola vez.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={alCancelar}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
