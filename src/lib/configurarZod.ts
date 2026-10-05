import { z } from "zod"

// zod acelera la validación generando código con `new Function`, y lo comprueba al crear cada esquema. La política
// de seguridad de contenido del despliegue (vercel.json, script-src 'self') lo prohíbe: se desactiva para que ni
// lo intente. Este módulo debe importarse antes que cualquier otro que defina esquemas (ver main.tsx).
z.config({ jitless: true })
