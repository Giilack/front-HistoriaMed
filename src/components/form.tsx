import * as React from "react"
import { ChevronDown, CircleAlert, CircleCheck, Info } from "lucide-react"

import { cn } from "@/lib/utils"

// Mismo aspecto que el Input de shadcn/ui, pero con elementos nativos: así react-hook-form (register) funciona igual.
const claseControl =
  "h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(claseControl, props.className)} />
}

/** Lista desplegable nativa con flecha propia. `className` se aplica al contenedor (por ejemplo, el ancho). */
export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative block w-full", className)}>
      <select
        {...props}
        className={cn(claseControl, "cursor-pointer appearance-none pr-9")}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </span>
  )
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cn(claseControl, "h-auto py-2", props.className)}
    />
  )
}

/** Etiqueta + control + mensaje de error del campo. */
export function Campo({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {error && (
        <span className="text-xs font-medium text-destructive">{error}</span>
      )}
    </label>
  )
}

const ALERTA = {
  error: {
    icono: CircleAlert,
    clase: "border-destructive/25 bg-destructive/5 text-destructive",
  },
  exito: {
    icono: CircleCheck,
    clase:
      "border-green-600/25 bg-green-600/5 text-green-800 dark:text-green-400",
  },
  info: {
    icono: Info,
    clase:
      "border-marca/20 bg-marca-claro/60 text-marca-oscuro dark:bg-muted dark:text-foreground",
  },
}

export function Alerta({
  tipo = "error",
  children,
}: {
  tipo?: "error" | "exito" | "info"
  children: React.ReactNode
}) {
  const { icono: Icono, clase } = ALERTA[tipo]
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
        clase
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
