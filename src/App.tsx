import * as React from "react"

import { useAuth } from "@/auth/AuthContext"
import { AppSidebar } from "@/components/layout/AppSidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearFecha, hoyISO } from "@/lib/fechas"
import { MENU, TITULO_VISTA, type Vista } from "@/lib/navegacion"
import {
  CambiarPasswordPage,
  DialogoCambiarPassword,
} from "@/pages/CambiarPasswordPage"
import { LoginPage } from "@/pages/LoginPage"

/*
 * Cada pantalla se descarga recién cuando se abre: la página de inicio de sesión carga solo lo necesario para
 * entrar, y cada rol descarga solo las pantallas que usa.
 */
const AuditoriaPage = React.lazy(() =>
  import("@/pages/AuditoriaPage").then((m) => ({ default: m.AuditoriaPage }))
)
const CitasPage = React.lazy(() =>
  import("@/pages/citas/CitasPage").then((m) => ({ default: m.CitasPage }))
)
const ColaPage = React.lazy(() =>
  import("@/pages/citas/ColaPage").then((m) => ({ default: m.ColaPage }))
)
const ConsultoriosPage = React.lazy(() =>
  import("@/pages/ConsultoriosPage").then((m) => ({
    default: m.ConsultoriosPage,
  }))
)
const InicioPage = React.lazy(() =>
  import("@/pages/InicioPage").then((m) => ({ default: m.InicioPage }))
)
const PacientesPage = React.lazy(() =>
  import("@/pages/pacientes/PacientesPage").then((m) => ({
    default: m.PacientesPage,
  }))
)
const ReportesPage = React.lazy(() =>
  import("@/pages/ReportesPage").then((m) => ({ default: m.ReportesPage }))
)
const UsuariosPage = React.lazy(() =>
  import("@/pages/UsuariosPage").then((m) => ({ default: m.UsuariosPage }))
)

export function App() {
  const { usuario, cargando } = useAuth()
  const [vista, setVista] = React.useState<Vista>("inicio")
  const [cambiandoPassword, setCambiandoPassword] = React.useState(false)

  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex w-64 flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }
  if (!usuario) return <LoginPage />
  if (usuario.debeCambiarPassword) return <CambiarPasswordPage />

  // Si cambia el usuario (otro rol), no mostrar una vista que no le corresponde
  const permitida = MENU.some(
    (m) => m.vista === vista && m.roles.includes(usuario.rol)
  )
  const vistaActual: Vista = permitida ? vista : "inicio"

  return (
    <SidebarProvider>
      <AppSidebar
        vista={vistaActual}
        alNavegar={setVista}
        alCambiarPassword={() => setCambiandoPassword(true)}
      />
      {cambiandoPassword && (
        <DialogoCambiarPassword alCerrar={() => setCambiandoPassword(false)} />
      )}
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <Separator orientation="vertical" className="mr-1 h-5!" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">
                HistoriaMed
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">
                  {TITULO_VISTA[vistaActual]}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <span className="ml-auto hidden text-sm text-muted-foreground capitalize md:block">
            {formatearFecha(hoyISO())}
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <React.Suspense fallback={<CargandoPantalla />}>
              {vistaActual === "inicio" && <InicioPage alNavegar={setVista} />}
              {vistaActual === "citas" && <CitasPage />}
              {vistaActual === "colaTriaje" && <ColaPage modo="triaje" />}
              {vistaActual === "misPacientes" && <ColaPage modo="medico" />}
              {vistaActual === "pacientes" && <PacientesPage />}
              {vistaActual === "consultorios" && <ConsultoriosPage />}
              {vistaActual === "usuarios" && <UsuariosPage />}
              {vistaActual === "reportes" && <ReportesPage />}
              {vistaActual === "auditoria" && <AuditoriaPage />}
            </React.Suspense>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function CargandoPantalla() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default App
