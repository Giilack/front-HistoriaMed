import { Accessibility, Moon, RotateCcw, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAccesibilidad, type TamanoTexto } from "@/lib/accesibilidad"
import { cn } from "@/lib/utils"

const TAMANOS: { valor: TamanoTexto; etiqueta: string; muestra: string }[] = [
  { valor: "normal", etiqueta: "Texto normal", muestra: "text-sm" },
  { valor: "grande", etiqueta: "Texto grande", muestra: "text-base" },
  { valor: "muy-grande", etiqueta: "Texto muy grande", muestra: "text-lg" },
]

/** Ajustes para personas con baja visión o sensibilidad al movimiento. Está disponible antes y después de entrar. */
export function PanelAccesibilidad({ className }: { className?: string }) {
  const a = useAccesibilidad()
  const { theme, setTheme } = useTheme()
  const oscuro =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground", className)}
            aria-label="Opciones de accesibilidad"
            title="Accesibilidad"
          />
        }
      >
        <Accessibility className="size-5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Accesibilidad</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">
              Tamaño del texto
            </legend>
            <div className="grid grid-cols-3 gap-1.5">
              {TAMANOS.map((t) => (
                <Button
                  key={t.valor}
                  type="button"
                  variant={a.tamano === t.valor ? "default" : "outline"}
                  aria-pressed={a.tamano === t.valor}
                  aria-label={t.etiqueta}
                  onClick={() => a.cambiar({ tamano: t.valor })}
                >
                  <span className={t.muestra} aria-hidden>
                    A
                  </span>
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <Opcion
              etiqueta="Alto contraste"
              activa={a.altoContraste}
              alCambiar={(v) => a.cambiar({ altoContraste: v })}
            />
            <Opcion
              etiqueta="Reducir animaciones"
              activa={a.reducirMovimiento}
              alCambiar={(v) => a.cambiar({ reducirMovimiento: v })}
            />
            <Opcion
              etiqueta="Subrayar enlaces y botones de texto"
              activa={a.subrayarEnlaces}
              alCambiar={(v) => a.cambiar({ subrayarEnlaces: v })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTheme(oscuro ? "light" : "dark")}
            >
              {oscuro ? <Sun /> : <Moon />}
              {oscuro ? "Usar modo claro" : "Usar modo oscuro"}
            </Button>
            <Button type="button" variant="ghost" onClick={a.restablecer}>
              <RotateCcw />
              Restablecer ajustes
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Opcion({
  etiqueta,
  activa,
  alCambiar,
}: {
  etiqueta: string
  activa: boolean
  alCambiar: (valor: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <Checkbox
        checked={activa}
        onCheckedChange={(v) => alCambiar(v === true)}
      />
      {etiqueta}
    </label>
  )
}
