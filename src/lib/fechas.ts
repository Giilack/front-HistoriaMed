/** Fecha de hoy en la zona horaria del navegador, formato "2026-09-28". */
export function hoyISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

/** "2026-09-28" → fecha local (sin el desfase que produce new Date("2026-09-28"), que la toma como UTC). */
export function fechaLocal(iso: string) {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d)
}

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

/** "2026-09-28" → "lun., 28/09/2026" */
export function formatearFecha(iso: string) {
  return formatoFecha.format(fechaLocal(iso))
}

/** "08:30:00" → "08:30" */
export function formatearHora(hora: string | null) {
  return hora ? hora.slice(0, 5) : ""
}

const formatoHoraInstante = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
})

/** Instante ISO → "08:42" (hora local) */
export function horaDe(instante: string | null) {
  return instante ? formatoHoraInstante.format(new Date(instante)) : ""
}

/** Minutos transcurridos desde un instante ISO hasta `ahora`. */
export function minutosDesde(instante: string, ahora: number) {
  return Math.max(0, Math.floor((ahora - new Date(instante).getTime()) / 60000))
}
