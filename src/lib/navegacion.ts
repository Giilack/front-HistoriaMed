import {
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  HeartPulse,
  House,
  ScrollText,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import type { Rol } from "@/lib/types"

export type Vista =
  | "inicio"
  | "citas"
  | "colaTriaje"
  | "misPacientes"
  | "pacientes"
  | "usuarios"
  | "consultorios"
  | "auditoria"
  | "reportes"
  | "cuenta"

export interface OpcionMenu {
  vista: Vista
  etiqueta: string
  icono: LucideIcon
  grupo: "General" | "Atención" | "Administración"
  roles: Rol[]
}

const TODOS: Rol[] = ["ADMIN", "ADMISION", "TRIAJE", "MEDICO"]

/** Menú lateral según el rol (los permisos reales los decide el backend). */
export const MENU: OpcionMenu[] = [
  {
    vista: "inicio",
    etiqueta: "Inicio",
    icono: House,
    grupo: "General",
    roles: TODOS,
  },
  {
    vista: "citas",
    etiqueta: "Citas",
    icono: CalendarDays,
    grupo: "Atención",
    roles: ["ADMISION"],
  },
  {
    vista: "colaTriaje",
    etiqueta: "Cola de triaje",
    icono: HeartPulse,
    grupo: "Atención",
    roles: ["TRIAJE"],
  },
  {
    vista: "misPacientes",
    etiqueta: "Mis pacientes",
    icono: Stethoscope,
    grupo: "Atención",
    roles: ["MEDICO"],
  },
  {
    vista: "pacientes",
    etiqueta: "Pacientes",
    icono: ClipboardList,
    grupo: "Atención",
    roles: ["ADMISION", "TRIAJE", "MEDICO"],
  },
  {
    vista: "usuarios",
    etiqueta: "Usuarios",
    icono: UsersRound,
    grupo: "Administración",
    roles: ["ADMIN"],
  },
  {
    vista: "consultorios",
    etiqueta: "Consultorios",
    icono: Building2,
    grupo: "Administración",
    roles: ["ADMIN"],
  },
  {
    vista: "reportes",
    etiqueta: "Reportes",
    icono: ChartColumn,
    grupo: "Administración",
    roles: ["ADMIN"],
  },
  {
    vista: "auditoria",
    etiqueta: "Auditoría",
    icono: ScrollText,
    grupo: "Administración",
    roles: ["ADMIN"],
  },
]

/** Título de cada vista (para la cabecera). "cuenta" no está en el menú: se abre desde el menú del usuario. */
export const TITULO_VISTA: Record<Vista, string> = {
  ...(Object.fromEntries(MENU.map((m) => [m.vista, m.etiqueta])) as Record<
    Vista,
    string
  >),
  cuenta: "Mi contraseña",
}
