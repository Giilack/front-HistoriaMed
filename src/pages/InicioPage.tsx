import { useAuth } from "@/auth/AuthContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NOMBRE_ROL, type Rol } from "@/lib/types"

// Funciones de cada rol según plan.md (sección 3); se irán habilitando por fases.
const FUNCIONES: Record<Rol, string[]> = {
  ADMIN: [
    "Gestionar usuarios",
    "Consultar la auditoría",
    "Gestionar consultorios",
  ],
  ADMISION: [
    "Registrar pacientes, su financiamiento y verificar su seguro",
    "Programar citas y registrar llegadas (con o sin cita)",
    "Subir documentos (fase 6)",
  ],
  TRIAJE: [
    "Ver la cola de triaje del día",
    "Buscar pacientes y ver su ficha",
    "Registrar signos vitales y prioridad (fase 4)",
    "Ver el resumen clínico del paciente (fase 4)",
  ],
  MEDICO: [
    "Ver sus pacientes del día",
    "Buscar pacientes y ver su ficha",
    "Atender pacientes de su cola (fase 5)",
    "Diagnosticar (CIE-10) y recetar (fase 5)",
    "Ver la historia clínica completa (fase 5)",
  ],
}

export function InicioPage() {
  const { usuario } = useAuth()
  if (!usuario) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bienvenido, {usuario.nombres}
        </h1>
        <p className="text-muted-foreground">
          Rol: {NOMBRE_ROL[usuario.rol]}
          {usuario.cmp && ` · CMP ${usuario.cmp}`}
        </p>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Sus funciones en el sistema</CardTitle>
          <CardDescription>
            Algunas se habilitarán en las siguientes fases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {FUNCIONES[usuario.rol].map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
