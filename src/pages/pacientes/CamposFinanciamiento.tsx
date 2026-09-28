import type { FieldError, UseFormRegisterReturn } from "react-hook-form"

import { Campo, Input, Select } from "@/components/form"
import { NOMBRE_FINANCIAMIENTO, type TipoFinanciamiento } from "@/lib/types"

import type { FinanciamientoForm } from "./esquemas"

type Errores = Partial<Record<keyof FinanciamientoForm, FieldError>>

/**
 * Campos de financiamiento. Se usan dentro del alta de paciente y en el formulario de cambio de seguro.
 */
export function CamposFinanciamiento({
  tipo,
  registrar,
  errores,
}: {
  tipo: TipoFinanciamiento
  registrar: (campo: keyof FinanciamientoForm) => UseFormRegisterReturn
  errores?: Errores
}) {
  const tieneSeguro = tipo !== "PARTICULAR"
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Campo label="Financiamiento" error={errores?.tipo?.message}>
        <Select {...registrar("tipo")}>
          {(Object.keys(NOMBRE_FINANCIAMIENTO) as TipoFinanciamiento[]).map(
            (t) => (
              <option key={t} value={t}>
                {NOMBRE_FINANCIAMIENTO[t]}
              </option>
            )
          )}
        </Select>
      </Campo>
      {tieneSeguro && (
        <>
          <Campo
            label="N.º de afiliación (opcional)"
            error={errores?.numeroAfiliacion?.message}
          >
            <Input {...registrar("numeroAfiliacion")} />
          </Campo>
          <Campo
            label={tipo === "PRIVADO" ? "Aseguradora o EPS" : "Plan (opcional)"}
            error={errores?.plan?.message}
          >
            <Input
              {...registrar("plan")}
              placeholder={
                tipo === "SIS" ? "ej. SIS Gratuito, SIS Para Todos" : undefined
              }
            />
          </Campo>
        </>
      )}
      {!tieneSeguro && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            {...registrar("orientadoAfiliacionSis")}
          />
          Se le orientó a afiliarse al SIS
        </label>
      )}
      {tieneSeguro && (
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
          El seguro quedará como <b>no verificado</b> hasta que se confirme en
          su padrón.
        </p>
      )}
    </div>
  )
}
