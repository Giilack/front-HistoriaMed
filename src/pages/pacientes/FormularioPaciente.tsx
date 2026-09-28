import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Path } from "react-hook-form"

import { Alerta, Campo, Input, Select } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api, json } from "@/lib/api"
import {
  NOMBRE_TIPO_DOCUMENTO,
  type Paciente,
  type TipoDocumento,
} from "@/lib/types"

import { CamposFinanciamiento } from "./CamposFinanciamiento"
import {
  PACIENTE_VACIO,
  formDesdePaciente,
  pacienteAPayload,
  pacienteSchema,
  type PacienteForm,
} from "./esquemas"

/**
 * Alta (sin `paciente`) o edición de los datos de filiación. En la edición no se muestra el financiamiento:
 * se cambia desde la ficha con su propio formulario.
 */
export function FormularioPaciente({
  paciente,
  alGuardar,
  alCancelar,
}: {
  paciente?: Paciente
  alGuardar: (p: Paciente) => void
  alCancelar: () => void
}) {
  const esNuevo = !paciente
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: paciente ? formDesdePaciente(paciente) : PACIENTE_VACIO,
  })
  const [error, setErrorGeneral] = React.useState<string | null>(null)
  const tipoDocumento = useWatch({ control, name: "tipoDocumento" })
  const tipoFinanciamiento = useWatch({
    control,
    name: "financiamiento.tipo",
  })

  async function enviar(datos: PacienteForm) {
    setErrorGeneral(null)
    try {
      const guardado = esNuevo
        ? await api<Paciente>("/api/pacientes", {
            method: "POST",
            ...json(pacienteAPayload(datos)),
          })
        : await api<Paciente>(`/api/pacientes/${paciente.id}`, {
            method: "PUT",
            ...json(pacienteAPayload(datos)),
          })
      alGuardar(guardado)
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorGeneral(e.message)
        // Los errores por campo del backend se muestran junto a cada campo
        for (const [campo, mensaje] of Object.entries(e.errores)) {
          setError(campo as Path<PacienteForm>, { message: mensaje })
        }
      } else {
        setErrorGeneral("No se pudo guardar")
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {esNuevo
            ? "Registrar paciente"
            : `Editar datos · ${paciente.numeroHc}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-6"
          noValidate
        >
          {error && <Alerta>{error}</Alerta>}

          <Seccion titulo="Identificación">
            <Campo
              label="Tipo de documento"
              error={errors.tipoDocumento?.message}
            >
              <Select {...register("tipoDocumento")}>
                {(Object.keys(NOMBRE_TIPO_DOCUMENTO) as TipoDocumento[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {NOMBRE_TIPO_DOCUMENTO[t]}
                    </option>
                  )
                )}
              </Select>
            </Campo>
            {tipoDocumento !== "SIN_DOCUMENTO" && (
              <Campo
                label="Número de documento"
                error={errors.numeroDocumento?.message}
              >
                <Input
                  {...register("numeroDocumento")}
                  inputMode={tipoDocumento === "DNI" ? "numeric" : undefined}
                  maxLength={tipoDocumento === "DNI" ? 8 : 20}
                  autoFocus={esNuevo}
                />
              </Campo>
            )}
            <Campo label="Nombres" error={errors.nombres?.message}>
              <Input {...register("nombres")} />
            </Campo>
            <Campo
              label="Apellido paterno"
              error={errors.apellidoPaterno?.message}
            >
              <Input {...register("apellidoPaterno")} />
            </Campo>
            <Campo
              label="Apellido materno"
              error={errors.apellidoMaterno?.message}
            >
              <Input {...register("apellidoMaterno")} />
            </Campo>
            <Campo
              label="Fecha de nacimiento"
              error={errors.fechaNacimiento?.message}
            >
              <Input type="date" {...register("fechaNacimiento")} />
            </Campo>
            <Campo label="Sexo" error={errors.sexo?.message}>
              <Select {...register("sexo")}>
                <option value="" disabled>
                  Seleccione…
                </option>
                <option value="FEMENINO">Femenino</option>
                <option value="MASCULINO">Masculino</option>
              </Select>
            </Campo>
          </Seccion>
          {tipoDocumento === "SIN_DOCUMENTO" && (
            <p className="-mt-3 text-xs text-muted-foreground">
              Se identificará por su número de historia clínica. Complete el
              documento cuando lo tenga.
            </p>
          )}

          <Seccion titulo="Contacto">
            <Campo label="Teléfono" error={errors.telefono?.message}>
              <Input {...register("telefono")} inputMode="tel" />
            </Campo>
            <Campo label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Campo>
            <Campo label="Dirección" error={errors.direccion?.message}>
              <Input {...register("direccion")} />
            </Campo>
          </Seccion>

          <Seccion titulo="Contacto de emergencia">
            <Campo
              label="Nombre"
              error={errors.contactoEmergenciaNombre?.message}
            >
              <Input {...register("contactoEmergenciaNombre")} />
            </Campo>
            <Campo
              label="Teléfono"
              error={errors.contactoEmergenciaTelefono?.message}
            >
              <Input
                {...register("contactoEmergenciaTelefono")}
                inputMode="tel"
              />
            </Campo>
            <Campo
              label="Parentesco"
              error={errors.contactoEmergenciaParentesco?.message}
            >
              <Input
                {...register("contactoEmergenciaParentesco")}
                placeholder="ej. madre, esposo"
              />
            </Campo>
          </Seccion>

          {esNuevo && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Financiamiento</h3>
              <CamposFinanciamiento
                tipo={tipoFinanciamiento}
                registrar={(campo) => register(`financiamiento.${campo}`)}
                errores={errors.financiamiento}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando…"
                : esNuevo
                  ? "Registrar paciente"
                  : "Guardar cambios"}
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

function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}
