import type * as React from "react"

import { IlustracionMedica } from "@/components/IlustracionMedica"
import { Marca } from "@/components/Marca"

/**
 * Pantalla de acceso en dos paneles: a la izquierda el nombre y una ilustración (se oculta en pantallas
 * pequeñas); a la derecha el formulario.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-marca-oscuro via-marca-oscuro to-marca lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-10 lg:p-10">
        {/* Trama sutil de puntos y halo celeste (solo fondo) */}
        <div
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-marca-acento/25 blur-3xl"
          aria-hidden
        />

        <h1 className="relative">
          <Marca clara tamano="portada" />
        </h1>
        <IlustracionMedica className="relative w-full max-w-md" />
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <Marca />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
