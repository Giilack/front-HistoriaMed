import { Alerta } from "@/components/form"
import { useApi } from "@/lib/useApi"

/** Avisa a quien atiende que parte de la historia viene de documentos antiguos. Es informativo: no pide aprobar nada. */
export function AvisoImportado({ pacienteId }: { pacienteId: number }) {
  const { datos: total } = useApi<number>(
    `/api/importaciones/del-paciente/${pacienteId}`
  )
  if (!total) return null
  return (
    <Alerta tipo="info">
      Parte de esta historia viene de {total} documento(s) anterior(es),
      revisados por Admisión. Si un dato es importante para decidir, compárelo
      con el documento original.
    </Alerta>
  )
}
