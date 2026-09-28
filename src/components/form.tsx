import * as React from "react"

const claseControl =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:opacity-50"

export function Input(props: React.ComponentProps<"input">) {
  return (
    <input {...props} className={`${claseControl} ${props.className ?? ""}`} />
  )
}

export function Select(props: React.ComponentProps<"select">) {
  return (
    <select {...props} className={`${claseControl} ${props.className ?? ""}`} />
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
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  )
}

export function Alerta({
  tipo = "error",
  children,
}: {
  tipo?: "error" | "exito" | "info"
  children: React.ReactNode
}) {
  const estilos = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    exito:
      "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
    info: "border-border bg-muted text-foreground",
  }
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${estilos[tipo]}`}
    >
      {children}
    </div>
  )
}
