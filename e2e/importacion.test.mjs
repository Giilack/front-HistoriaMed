// Importación masiva por Admisión, de punta a punta con la IA real. Registra datos: no se ejecuta en la nube.
import assert from "node:assert/strict"
import path from "node:path"

import { By, Key, until } from "selenium-webdriver"

import {
  SOLO_LECTURA,
  ESPERA,
  abrirNavegador,
  boton,
  capturar,
  capturarSiFallo,
  clic,
  entrarYEsperar,
  esperarTexto,
  menu,
} from "./comunes.mjs"

const PDF = path.resolve("e2e/datos/historia-ficticia.pdf")
const NOMBRE = "historia-ficticia.pdf"
const LA_IA_TERMINA = 120000

describe("Importación de historias", function () {
  this.timeout(300000)
  let driver

  before(function () {
    if (SOLO_LECTURA) this.skip()
  })

  beforeEach(async () => {
    driver = await abrirNavegador()
    await entrarYEsperar(driver, "admision.demo")
    await menu(driver, "Importar historias")
    await esperarTexto(driver, "Suba las historias")
  })

  afterEach(async function () {
    await capturarSiFallo(this, driver)
    if (driver) await driver.quit()
  })

  const subirYAbrir = async () => {
    await driver.findElement(By.css('input[type="file"]')).sendKeys(PDF)
    await clic(driver, boton("Revisar"), LA_IA_TERMINA)
    await esperarTexto(driver, "Datos para la historia")
    await driver.wait(async () => /^\/importacion\/\d+$/.test(new URL(await driver.getCurrentUrl()).pathname), ESPERA)
  }

  const campo = (etiqueta) =>
    driver.findElement(By.xpath(`//label[span[normalize-space(.)=${JSON.stringify(etiqueta)}]]//input`))

  const aprobar = () => driver.findElement(By.xpath('//button[starts-with(normalize-space(.), "Aprobar (")]'))

  it("I-01 Dice qué falta, marca el campo y no deja aprobar", async () => {
    await subirYAbrir()
    const nombres = await campo("Nombres")
    await nombres.sendKeys(Key.chord(Key.CONTROL, "a"), Key.DELETE)
    await esperarTexto(driver, "Para aprobar falta:")
    await esperarTexto(driver, "Escriba los nombres")
    assert.equal(await (await aprobar()).isEnabled(), false)
    await capturar(driver, "I-01-falta")
    await clic(driver, boton("Eliminar documento"))
    await clic(driver, boton("Sí, eliminar"))
    await esperarTexto(driver, "Documento eliminado")
  })

  it("I-02 Corrige un dato, aprueba y después anula", async () => {
    await subirYAbrir()
    await capturar(driver, "I-02-revision")
    await clic(driver, By.css('[aria-label^="Editar Glucosa"]'))
    const valor = await campo("Resultado")
    await valor.sendKeys(Key.chord(Key.CONTROL, "a"), "999")
    await clic(driver, boton("Guardar"))
    await esperarTexto(driver, "999")
    // La IA no siempre indica todo: lo que falte lo completa Admisión, como en el uso real
    for (const pendiente of await driver.findElements(By.xpath('//*[contains(., "Falta el tipo o la gravedad")]/ancestor::div[.//button[starts-with(@aria-label, "Editar")]][1]//button[starts-with(@aria-label, "Editar")]'))) {
      await pendiente.click()
      await clic(driver, boton("Guardar"))
    }
    await driver.wait(async () => (await aprobar()).isEnabled(), ESPERA)
    await (await aprobar()).click()
    await esperarTexto(driver, "corregido")
    await driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === "/importacion", ESPERA)

    // Solo la fila de este archivo: en la lista puede haber otras importaciones que no son de la prueba
    await clic(driver, By.xpath(`//li[.//span[normalize-space(.)=${JSON.stringify(NOMBRE)}]][.//*[normalize-space(.)="Aprobada"]]//button[contains(., "Anular")]`))
    await (await campo("Motivo de la anulación")).sendKeys("Prueba automática")
    await clic(driver, boton("Confirmar anulación"))
    await esperarTexto(driver, "Importación anulada")
  })

  it("I-03 Elimina un documento desde la lista", async () => {
    await driver.findElement(By.css('input[type="file"]')).sendKeys(PDF)
    // Mientras la IA lee el archivo no se puede eliminar: se espera a que termine
    await driver.wait(until.elementLocated(By.xpath(`//li[.//span[normalize-space(.)=${JSON.stringify(NOMBRE)}]]//button[normalize-space(.)="Revisar"]`)), LA_IA_TERMINA)
    await clic(driver, By.css(`[aria-label="Eliminar ${NOMBRE}"]`))
    await clic(driver, boton("Sí, eliminar"))
    await esperarTexto(driver, "Documento eliminado")
    await driver.wait(until.elementLocated(By.css('input[type="file"]')), ESPERA)
  })
})
