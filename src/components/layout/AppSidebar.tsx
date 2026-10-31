import {
  ChevronsUpDown,
  CircleUserRound,
  KeyRound,
  LogOut,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { Marca } from "@/components/Marca"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { MENU, type OpcionMenu, type Vista } from "@/lib/navegacion"
import { NOMBRE_ROL } from "@/lib/types"

const GRUPOS: OpcionMenu["grupo"][] = ["General", "Atención", "Administración"]

/**
 * Menú lateral blanco. Se contrae a solo iconos (con tooltip) y en celular se abre como panel deslizable.
 */
export function AppSidebar({
  vista,
  alNavegar,
  alCambiarPassword,
}: {
  vista: Vista
  alNavegar: (v: Vista) => void
  alCambiarPassword: () => void
}) {
  const { usuario } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  if (!usuario) return null
  const opciones = MENU.filter((m) => m.roles.includes(usuario.rol))

  // En celular el menú es un panel que tapa la pantalla: se cierra al elegir una opción
  const elegir = (accion: () => void) => {
    if (isMobile) setOpenMobile(false)
    accion()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b px-3 group-data-[collapsible=icon]:px-2">
        <Marca />
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {GRUPOS.map((grupo) => {
          const delGrupo = opciones.filter((o) => o.grupo === grupo)
          if (delGrupo.length === 0) return null
          return (
            <SidebarGroup key={grupo}>
              <SidebarGroupLabel className="text-[11px] tracking-wider uppercase">
                {grupo}
              </SidebarGroupLabel>
              <SidebarMenu>
                {delGrupo.map((o) => (
                  <SidebarMenuItem key={o.vista}>
                    <SidebarMenuButton
                      isActive={vista === o.vista}
                      tooltip={o.etiqueta}
                      onClick={() => elegir(() => alNavegar(o.vista))}
                      // Opción activa: celeste claro con una barra azul petróleo a la izquierda
                      className="relative h-9 data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:-left-2 data-active:before:w-1 data-active:before:rounded-r-full data-active:before:bg-marca group-data-[collapsible=icon]:data-active:before:hidden [&_svg]:text-muted-foreground data-active:[&_svg]:text-marca"
                    >
                      <o.icono />
                      <span>{o.etiqueta}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t">
        {isMobile ? (
          <OpcionesUsuarioMovil
            alCambiarPassword={() => elegir(alCambiarPassword)}
            alSalir={() => elegir(() => alNavegar("inicio"))}
          />
        ) : (
          <MenuUsuario
            alNavegar={alNavegar}
            alCambiarPassword={alCambiarPassword}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Celular: las opciones van a la vista dentro del panel. Un menú flotante no sirve aquí: el panel es modal y ocupa
 * casi la pantalla entera, así que el menú se abría fuera de la vista y no se podía cerrar sesión.
 */
function OpcionesUsuarioMovil({
  alCambiarPassword,
  alSalir,
}: {
  alCambiarPassword: () => void
  alSalir: () => void
}) {
  const { usuario, logout } = useAuth()
  if (!usuario) return null
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2 px-2 py-1">
        <CircleUserRound className="size-5 shrink-0 text-marca" aria-hidden />
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium text-foreground">
            {usuario.nombres} {usuario.apellidos}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {NOMBRE_ROL[usuario.rol]}
          </span>
        </span>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton className="h-11" onClick={alCambiarPassword}>
          <KeyRound />
          <span>Cambiar contraseña</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="h-11 text-destructive hover:text-destructive"
          onClick={() => {
            alSalir()
            void logout()
          }}
        >
          <LogOut />
          <span>Cerrar sesión</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function MenuUsuario({
  alNavegar,
  alCambiarPassword,
}: {
  alNavegar: (v: Vista) => void
  alCambiarPassword: () => void
}) {
  const { usuario, logout } = useAuth()
  if (!usuario) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent"
              />
            }
          >
            {/* Icono solo para que el botón se vea con el menú contraído */}
            <CircleUserRound className="size-5! text-marca" aria-hidden />
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium text-foreground">
                {usuario.nombres} {usuario.apellidos}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {NOMBRE_ROL[usuario.rol]}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block text-sm font-medium text-foreground">
                  {usuario.nombres} {usuario.apellidos}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {usuario.username} · {NOMBRE_ROL[usuario.rol]}
                  {usuario.cmp && ` · CMP ${usuario.cmp}`}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={alCambiarPassword}>
              <KeyRound />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                alNavegar("inicio")
                void logout()
              }}
            >
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
