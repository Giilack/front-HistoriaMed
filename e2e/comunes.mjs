// Utilidades de las pruebas de interfaz con Selenium WebDriver (Microsoft Edge sin ventana).
import fs from "node:fs"
import path from "node:path"

import { Browser, Builder, By, until } from "selenium-webdriver"
import edge from "selenium-webdriver/edge.js"

export const BASE = (process.env.E2E_URL ?? "http://localhost:5173").replace(/\/$/, "")
export const CLAVE = process.env.E2E_PASSWORD
// En la nube no se registran datos: los casos que escriben se omiten
export const SOLO_LECTURA = process.env.E2E_SOLO_LECTURA === "true"
export const CAPTURAS = process.env.E2E_CAPTURAS ?? "e2e/resultados/capturas"
export const ESPERA = Number(process.env.E2E_ESPERA ?? 30000)

if (!CLAVE) throw new Error("Defina E2E_PASSWORD con la contraseña de los usuarios demo")
fs.mkdirSync(CAPTURAS, { recursive: true })

export const CELULAR = { width: 390, height: 844 }
export const ESCRITORIO = { width: 1366, height: 900 }

export async function abrirNavegador({ width, height } = ESCRITORIO) {
  const opciones = new edge.Options()
  opciones.addArguments("--headless=new", "--disable-gpu", "--no-sandbox", `--window-size=${width},${height}`)
  if (width < 768) opciones.setMobileEmulation({ deviceMetrics: { width, height, pixelRatio: 2, touch: true } })
  return new Builder().forBrowser(Browser.EDGE).setEdgeOptions(opciones).build()
}

export const porTexto = (texto, etiqueta = "*") =>
  By.xpath(`//${etiqueta}[contains(normalize-space(.), ${JSON.stringify(texto)})]`)

export const boton = (texto) =>
  By.xpath(`//*[self::button or self::a or @role='tab' or @role='menuitem'][contains(normalize-space(.), ${JSON.stringify(texto)})]`)

export async function esperarTexto(driver, texto, tiempo = ESPERA) {
  return driver.wait(async () => (await driver.findElement(By.css("body")).getText()).includes(texto), tiempo,
    `No apareció el texto «${texto}»`)
}

export async function clic(driver, localizador, tiempo = ESPERA) {
  const el = await driver.wait(until.elementLocated(localizador), tiempo)
  await driver.wait(until.elementIsVisible(el), tiempo)
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", el)
  await el.click()
  return el
}

/** Inicia sesión; en la nube el backend gratuito puede tardar en despertar. */
export async function entrar(driver, usuario, clave = CLAVE) {
  await driver.get(BASE)
  const nombre = await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), ESPERA)
  await nombre.sendKeys(usuario)
  await driver.findElement(By.css('input[autocomplete="current-password"]')).sendKeys(clave)
  await driver.findElement(By.css('button[type="submit"]')).click()
}

export async function entrarYEsperar(driver, usuario) {
  await entrar(driver, usuario)
  await driver.wait(until.elementLocated(By.id("contenido")), Math.max(ESPERA, 90000))
  await driver.wait(until.elementLocated(By.css("main h1")), ESPERA)
}

export async function menu(driver, texto) {
  await clic(driver, By.xpath(`//*[@data-slot="sidebar-menu-button"][contains(normalize-space(.), ${JSON.stringify(texto)})]`))
}

export async function buscarPaciente(driver, dato) {
  const caja = await driver.wait(until.elementLocated(By.css('input[placeholder*="45678912"]')), ESPERA)
  await caja.clear()
  await caja.sendKeys(dato)
}

export async function capturar(driver, nombre) {
  const png = await driver.takeScreenshot()
  fs.writeFileSync(path.join(CAPTURAS, `${nombre}.png`), png, "base64")
}

/** Guarda una captura si el caso falló, para ver qué había en pantalla. */
export async function capturarSiFallo(contexto, driver) {
  if (contexto.currentTest?.state === "failed") {
    const nombre = contexto.currentTest.title.split(" ")[0]
    await capturar(driver, `fallo-${nombre}`).catch(() => {})
  }
}
