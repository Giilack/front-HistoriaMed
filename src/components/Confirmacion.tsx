/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface OpcionesConfirmar {
  titulo: string
  descripcion?: React.ReactNode
  /** Texto del botón de confirmación (por defecto "Confirmar"). */
  accion?: string
  /** Acción irreversible o que quita algo: botón en rojo y un icono de advertencia. */
  destructivo?: boolean
}

interface OpcionesTexto extends OpcionesConfirmar {
  etiqueta: string
  placeholder?: string
  maximo?: number
}

type Pedido =
  | {
      tipo: "confirmar"
      opciones: OpcionesConfirmar
      resolver: (ok: boolean) => void
    }
  | {
      tipo: "texto"
      opciones: OpcionesTexto
      resolver: (texto: string | null) => void
    }

interface Confirmacion {
  /** Reemplaza a window.confirm: resuelve true si el usuario confirma. */
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>
  /** Reemplaza a window.prompt: resuelve el texto escrito, o null si cancela. El texto es obligatorio. */
  pedirTexto: (opciones: OpcionesTexto) => Promise<string | null>
}

const ContextoConfirmacion = React.createContext<Confirmacion | undefined>(
  undefined
)

/** Diálogos de confirmación del sistema (en lugar de los cuadros nativos del navegador). */
export function ConfirmacionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [pedido, setPedido] = React.useState<Pedido | null>(null)
  const [texto, setTexto] = React.useState("")

  const valor = React.useMemo<Confirmacion>(
    () => ({
      confirmar: (opciones) =>
        new Promise((resolver) =>
          setPedido({ tipo: "confirmar", opciones, resolver })
        ),
      pedirTexto: (opciones) =>
        new Promise((resolver) => {
          setTexto("")
          setPedido({ tipo: "texto", opciones, resolver })
        }),
    }),
    []
  )

  function cerrar(aceptado: boolean) {
    if (!pedido) return
    if (pedido.tipo === "confirmar") pedido.resolver(aceptado)
    else pedido.resolver(aceptado ? texto.trim() : null)
    setPedido(null)
  }

  const o = pedido?.opciones
  const faltaTexto = pedido?.tipo === "texto" && !texto.trim()

  return (
    <ContextoConfirmacion.Provider value={valor}>
      {children}
      <AlertDialog
        open={!!pedido}
        onOpenChange={(abierto) => !abierto && cerrar(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            {o?.destructivo && (
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <TriangleAlert />
              </AlertDialogMedia>
            )}
            <AlertDialogTitle>{o?.titulo}</AlertDialogTitle>
            {o?.descripcion && (
              <AlertDialogDescription>{o.descripcion}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {pedido?.tipo === "texto" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmacion-texto">
                {pedido.opciones.etiqueta}
              </Label>
              <Textarea
                id="confirmacion-texto"
                autoFocus
                value={texto}
                maxLength={pedido.opciones.maximo ?? 200}
                placeholder={pedido.opciones.placeholder}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              variant={o?.destructivo ? "destructive" : "default"}
              disabled={faltaTexto}
              onClick={() => cerrar(true)}
            >
              {o?.accion ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextoConfirmacion.Provider>
  )
}

export function useConfirmacion() {
  const ctx = React.useContext(ContextoConfirmacion)
  if (!ctx)
    throw new Error(
      "useConfirmacion debe usarse dentro de ConfirmacionProvider"
    )
  return ctx
}
