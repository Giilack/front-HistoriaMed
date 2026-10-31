// Auditoría de Lighthouse de la pantalla pública: rendimiento, accesibilidad, buenas prácticas y SEO, en escritorio y celular.
import fs from "node:fs"

import * as chromeLauncher from "chrome-launcher"
import lighthouse, { desktopConfig } from "lighthouse"

const URL = (process.env.E2E_URL ?? "http://localhost:5173").replace(/\/$/, "")
const CARPETA = process.env.E2E_LIGHTHOUSE ?? "e2e/resultados/lighthouse"
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

fs.mkdirSync(CARPETA, { recursive: true })
const navegador = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? EDGE,
  chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
})
const opciones = { port: navegador.port, output: ["html", "json"], logLevel: "error" }
const resumen = {}
try {
  for (const [nombre, config] of [["escritorio", desktopConfig], ["celular", undefined]]) {
    const r = await lighthouse(URL, opciones, config)
    fs.writeFileSync(`${CARPETA}/${nombre}.html`, r.report[0])
    fs.writeFileSync(`${CARPETA}/${nombre}.json`, r.report[1])
    resumen[nombre] = Object.fromEntries(
      Object.values(r.lhr.categories).map((c) => [c.id, Math.round(c.score * 100)])
    )
    resumen[nombre].lcpSegundos = Number((r.lhr.audits["largest-contentful-paint"].numericValue / 1000).toFixed(2))
  }
} finally {
  navegador.kill()
}
fs.writeFileSync(`${CARPETA}/resumen.json`, JSON.stringify(resumen, null, 2))
console.log(JSON.stringify(resumen))
