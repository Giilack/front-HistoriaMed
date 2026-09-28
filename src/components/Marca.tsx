import { HeartPulse } from "lucide-react"

const TAMANOS = {
  normal: {
    caja: "size-8 rounded-lg",
    icono: "size-[18px]",
    texto: "text-lg",
    separacion: "gap-2.5",
  },
  portada: {
    caja: "size-16 rounded-2xl",
    icono: "size-9",
    texto: "text-5xl",
    separacion: "gap-4",
  },
}

/**
 * Logotipo de HistoriaMed: isotipo (pulso cardiaco) + nombre.
 * @param clara versión para fondos oscuros (panel del login)
 */
export function Marca({
  clara = false,
  tamano = "normal",
}: {
  clara?: boolean
  tamano?: keyof typeof TAMANOS
}) {
  const t = TAMANOS[tamano]
  return (
    <span className={`inline-flex items-center ${t.separacion}`}>
      <span
        className={`flex items-center justify-center ${t.caja} ${
          clara
            ? "bg-white/15 text-white ring-1 ring-white/25"
            : "bg-marca text-white"
        }`}
        aria-hidden
      >
        <HeartPulse className={t.icono} strokeWidth={2.25} />
      </span>
      <span
        className={`font-semibold tracking-tight ${t.texto} ${
          clara ? "text-white" : "text-marca-oscuro dark:text-foreground"
        }`}
      >
        Historia
        <span className={clara ? "text-marca-acento" : "text-marca"}>Med</span>
      </span>
    </span>
  )
}
