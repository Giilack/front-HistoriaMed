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
import { AuditoriaPage } from "@/pages/AuditoriaPage"
import { CambiarPasswordPage } from "@/pages/CambiarPasswordPage"
import { CitasPage } from "@/pages/citas/CitasPage"
import { ColaPage } from "@/pages/citas/ColaPage"
import { ConsultoriosPage } from "@/pages/ConsultoriosPage"
import { InicioPage } from "@/pages/InicioPage"
import { LoginPage } from "@/pages/LoginPage"
import { PacientesPage } from "@/pages/pacientes/PacientesPage"
import { ReportesPage } from "@/pages/ReportesPage"
import { UsuariosPage } from "@/pages/UsuariosPage"

export function App() {
  const { usuario, cargando } = useAuth()
  const [vista, setVista] = React.useState<Vista>("inicio")

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
  if (usuario.debeCambiarPassword) return <CambiarPasswordPage obligatorio />

  // Si cambia el usuario (otro rol), no mostrar una vista que no le corresponde
  const permitida =
    vista === "cuenta" ||
    MENU.some((m) => m.vista === vista && m.roles.includes(usuario.rol))
  const vistaActual: Vista = permitida ? vista : "inicio"

  return (
    <SidebarProvider>
      <AppSidebar vista={vistaActual} alNavegar={setVista} />
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
            {vistaActual === "inicio" && <InicioPage alNavegar={setVista} />}
            {vistaActual === "citas" && <CitasPage />}
            {vistaActual === "colaTriaje" && <ColaPage modo="triaje" />}
            {vistaActual === "misPacientes" && <ColaPage modo="medico" />}
            {vistaActual === "pacientes" && <PacientesPage />}
            {vistaActual === "consultorios" && <ConsultoriosPage />}
            {vistaActual === "usuarios" && <UsuariosPage />}
            {vistaActual === "reportes" && <ReportesPage />}
            {vistaActual === "auditoria" && <AuditoriaPage />}
            {vistaActual === "cuenta" && (
              <CambiarPasswordPage obligatorio={false} />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
