/**
 * Ilustración del login: una historia clínica con el trazo del pulso, una cruz médica y un estetoscopio,
 * en los colores de la marca. SVG propio (sin imágenes externas ni licencias). Es decorativa: el lector de
 * pantalla la omite.
 */
export function IlustracionMedica({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 380"
      className={className}
      aria-hidden
      role="presentation"
      fill="none"
    >
      {/* Halo de fondo */}
      <circle cx="200" cy="195" r="165" fill="#38bdf8" fillOpacity="0.12" />
      <circle cx="200" cy="195" r="125" fill="#38bdf8" fillOpacity="0.1" />

      {/* Estetoscopio (detrás de la historia) */}
      <path
        d="M96 118 C 58 150, 58 238, 110 262 C 140 276, 150 300, 148 322"
        stroke="#e0f2fe"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M96 118 L 84 102"
        stroke="#e0f2fe"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="80" cy="97" r="7" fill="#e0f2fe" />
      <circle
        cx="148"
        cy="330"
        r="22"
        fill="#0c4a6e"
        stroke="#e0f2fe"
        strokeWidth="7"
      />
      <circle cx="148" cy="330" r="8" fill="#38bdf8" />

      {/* Historia clínica (tablilla) */}
      <rect
        x="118"
        y="62"
        width="184"
        height="250"
        rx="20"
        fill="#0c4a6e"
        fillOpacity="0.35"
        transform="translate(8 10)"
      />
      <rect x="118" y="62" width="184" height="250" rx="20" fill="#ffffff" />
      <rect x="172" y="46" width="76" height="34" rx="11" fill="#bae6fd" />
      <rect
        x="190"
        y="56"
        width="40"
        height="8"
        rx="4"
        fill="#0369a1"
        fillOpacity="0.5"
      />

      {/* Encabezado: foto del paciente y datos */}
      <circle cx="158" cy="118" r="18" fill="#e0f2fe" />
      <circle cx="158" cy="113" r="7" fill="#7dd3fc" />
      <path d="M145 129 C 148 121, 168 121, 171 129" fill="#7dd3fc" />
      <rect x="186" y="106" width="92" height="9" rx="4.5" fill="#cbd5e1" />
      <rect x="186" y="123" width="62" height="9" rx="4.5" fill="#e2e8f0" />

      {/* Trazo del pulso */}
      <rect x="138" y="156" width="144" height="70" rx="12" fill="#f0f9ff" />
      <polyline
        points="146,193 176,193 188,170 204,216 218,178 228,193 274,193"
        stroke="#0369a1"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Renglones */}
      <rect x="140" y="246" width="140" height="9" rx="4.5" fill="#e2e8f0" />
      <rect x="140" y="264" width="108" height="9" rx="4.5" fill="#e2e8f0" />
      <rect x="140" y="282" width="124" height="9" rx="4.5" fill="#e2e8f0" />

      {/* Cruz médica */}
      <circle cx="302" cy="84" r="36" fill="#38bdf8" />
      <circle
        cx="302"
        cy="84"
        r="36"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="5"
      />
      <rect x="295" y="66" width="14" height="36" rx="3" fill="#ffffff" />
      <rect x="284" y="77" width="36" height="14" rx="3" fill="#ffffff" />

      {/* Destellos */}
      <circle cx="330" cy="250" r="6" fill="#38bdf8" />
      <circle cx="346" cy="222" r="3.5" fill="#e0f2fe" />
      <circle cx="70" cy="200" r="4" fill="#e0f2fe" fillOpacity="0.8" />
    </svg>
  )
}
