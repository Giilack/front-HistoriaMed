import { ChevronsUpDown, KeyRound, LogOut, Moon, Sun } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { Marca } from "@/components/Marca"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
}: {
  vista: Vista
  alNavegar: (v: Vista) => void
}) {
  const { usuario } = useAuth()
  if (!usuario) return null
  const opciones = MENU.filter((m) => m.roles.includes(usuario.rol))

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
                      onClick={() => alNavegar(o.vista)}
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
        <MenuUsuario alNavegar={alNavegar} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function MenuUsuario({ alNavegar }: { alNavegar: (v: Vista) => void }) {
  const { usuario, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  if (!usuario) return null
  const iniciales =
    `${usuario.nombres[0] ?? ""}${usuario.apellidos[0] ?? ""}`.toUpperCase()
  const oscuro =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

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
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-marca text-xs font-semibold text-white">
                {iniciales}
              </AvatarFallback>
            </Avatar>
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
            <DropdownMenuItem onClick={() => alNavegar("cuenta")}>
              <KeyRound />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(oscuro ? "light" : "dark")}
            >
              {oscuro ? <Sun /> : <Moon />}
              {oscuro ? "Modo claro" : "Modo oscuro"}
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
