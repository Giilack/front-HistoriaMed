import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/ui/button"
import { NOMBRE_ROL, type Rol } from "@/lib/types"
import { AuditoriaPage } from "@/pages/AuditoriaPage"
import { CambiarPasswordPage } from "@/pages/CambiarPasswordPage"
import { CitasPage } from "@/pages/citas/CitasPage"
import { ColaPage } from "@/pages/citas/ColaPage"
import { ConsultoriosPage } from "@/pages/ConsultoriosPage"
import { InicioPage } from "@/pages/InicioPage"
import { LoginPage } from "@/pages/LoginPage"
import { PacientesPage } from "@/pages/pacientes/PacientesPage"
import { UsuariosPage } from "@/pages/UsuariosPage"

type Vista =
  | "inicio"
  | "citas"
  | "colaTriaje"
  | "misPacientes"
  | "pacientes"
  | "usuarios"
  | "consultorios"
  | "auditoria"
  | "cuenta"

// Menú según el rol. Las opciones de los demás roles se agregarán en las siguientes fases.
const MENU: { vista: Vista; etiqueta: string; roles: Rol[] }[] = [
  {
    vista: "inicio",
    etiqueta: "Inicio",
    roles: ["ADMIN", "ADMISION", "TRIAJE", "MEDICO"],
  },
  { vista: "citas", etiqueta: "Citas", roles: ["ADMISION"] },
  { vista: "colaTriaje", etiqueta: "Cola de triaje", roles: ["TRIAJE"] },
  { vista: "misPacientes", etiqueta: "Mis pacientes", roles: ["MEDICO"] },
  {
    vista: "pacientes",
    etiqueta: "Pacientes",
    roles: ["ADMISION", "TRIAJE", "MEDICO"],
  },
  { vista: "usuarios", etiqueta: "Usuarios", roles: ["ADMIN"] },
  { vista: "consultorios", etiqueta: "Consultorios", roles: ["ADMIN"] },
  { vista: "auditoria", etiqueta: "Auditoría", roles: ["ADMIN"] },
  {
    vista: "cuenta",
    etiqueta: "Mi contraseña",
    roles: ["ADMIN", "ADMISION", "TRIAJE", "MEDICO"],
  },
]

export function App() {
  const { usuario, cargando, logout } = useAuth()
  const [vista, setVista] = React.useState<Vista>("inicio")

  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    )
  }
  if (!usuario) return <LoginPage />
  if (usuario.debeCambiarPassword) return <CambiarPasswordPage obligatorio />

  const opciones = MENU.filter((m) => m.roles.includes(usuario.rol))
  // Si cambia el usuario (otro rol), no mostrar una vista que no le corresponde
  const vistaActual = opciones.some((m) => m.vista === vista) ? vista : "inicio"

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">HistoriaMed</span>
          <nav className="flex flex-wrap gap-1">
            {opciones.map((m) => (
              <Button
                key={m.vista}
                size="sm"
                variant={vistaActual === m.vista ? "secondary" : "ghost"}
                onClick={() => setVista(m.vista)}
              >
                {m.etiqueta}
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {usuario.nombres} {usuario.apellidos} · {NOMBRE_ROL[usuario.rol]}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setVista("inicio")
                void logout()
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {vistaActual === "inicio" && <InicioPage />}
        {vistaActual === "citas" && <CitasPage />}
        {vistaActual === "colaTriaje" && <ColaPage modo="triaje" />}
        {vistaActual === "misPacientes" && <ColaPage modo="medico" />}
        {vistaActual === "pacientes" && <PacientesPage />}
        {vistaActual === "consultorios" && <ConsultoriosPage />}
        {vistaActual === "usuarios" && <UsuariosPage />}
        {vistaActual === "auditoria" && <AuditoriaPage />}
        {vistaActual === "cuenta" && (
          <CambiarPasswordPage obligatorio={false} />
        )}
      </main>
    </div>
  )
}

export default App
