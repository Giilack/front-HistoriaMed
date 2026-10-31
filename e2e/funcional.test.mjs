// Pruebas funcionales de la interfaz: cada caso verifica un requisito del plan de pruebas desde el navegador.
import assert from "node:assert/strict"

import { By, until } from "selenium-webdriver"

import {
  SOLO_LECTURA,
  ESPERA,
  abrirNavegador,
  boton,
  buscarPaciente,
  capturar,
  capturarSiFallo,
  clic,
  entrar,
  entrarYEsperar,
  esperarTexto,
  menu,
  porTexto,
} from "./comunes.mjs"

describe("Funcionalidad de la interfaz", function () {
  this.timeout(180000)
  let driver

  beforeEach(async () => {
    driver = await abrirNavegador()
  })

  afterEach(async function () {
    await capturarSiFallo(this, driver)
    await driver.quit()
  })

  const opcionesMenu = async () => {
    const items = await driver.findElements(By.css('[data-slot="sidebar-menu-button"]'))
    return Promise.all(items.map((i) => i.getText()))
  }

  it("F-01 Inicio de sesión del médico (RF-01, CP-01)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await esperarTexto(driver, "Por atender")
    await capturar(driver, "F-01-inicio-medico")
  })

  it("F-02 Credenciales incorrectas: mensaje sin revelar qué falló (CP-02)", async () => {
    await entrar(driver, "usuario.inexistente", "Incorrecta123")
    await driver.wait(until.elementLocated(By.css('[role="alert"]')), 90000)
    const texto = await driver.findElement(By.css('[role="alert"]')).getText()
    assert.match(texto, /inválid|incorrect/i)
    assert.doesNotMatch(texto, /no existe/i)
    await capturar(driver, "F-02-login-incorrecto")
  })

  it("F-03 El menú del administrador no tiene módulos clínicos (RF-07, P1)", async () => {
    await entrarYEsperar(driver, "admin")
    const opciones = await opcionesMenu()
    assert.ok(opciones.includes("Auditoría") && opciones.includes("Usuarios"))
    assert.ok(!opciones.includes("Pacientes") && !opciones.includes("Mis pacientes"))
  })

  it("F-04 Cada rol ve solo sus módulos (CP-05)", async () => {
    const esperado = { "admision.demo": "Citas", "triaje.demo": "Cola de triaje", "dr.diaz": "Mis pacientes" }
    for (const [usuario, modulo] of Object.entries(esperado)) {
      await entrarYEsperar(driver, usuario)
      assert.ok((await opcionesMenu()).includes(modulo), `${usuario} debe ver ${modulo}`)
      await clic(driver, By.css('[data-slot="sidebar-footer"] button'))
      await clic(driver, boton("Cerrar sesión"))
      await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), ESPERA)
    }
  })

  it("F-05 Búsqueda de paciente por DNI cifrado (RF-04, CP-09)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await menu(driver, "Pacientes")
    await buscarPaciente(driver, "45678912")
    await esperarTexto(driver, "Quispe Mamani")
  })

  it("F-06 Búsqueda sin tildes ni mayúsculas (CP-10)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await menu(driver, "Pacientes")
    await buscarPaciente(driver, "huaman")
    await esperarTexto(driver, "Huamán")
  })

  it("F-07 La ficha muestra las alergias del paciente (HU-alergias)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await menu(driver, "Pacientes")
    await buscarPaciente(driver, "45678912")
    await clic(driver, porTexto("Quispe Mamani", "tr"))
    await clic(driver, boton("Resumen clínico"))
    await esperarTexto(driver, "Penicilina")
    await capturar(driver, "F-07-ficha-paciente")
  })

  it("F-08 Inyección SQL en el buscador no devuelve datos (CP-11)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await menu(driver, "Pacientes")
    await buscarPaciente(driver, "' OR '1'='1")
    await driver.sleep(2500)
    const texto = await driver.findElement(By.id("contenido")).getText()
    assert.doesNotMatch(texto, /Quispe Mamani/)
  })

  it("F-09 El administrador consulta reportes y auditoría", async () => {
    await entrarYEsperar(driver, "admin")
    await menu(driver, "Reportes")
    await esperarTexto(driver, "Citas")
    await capturar(driver, "F-09-reportes")
    await menu(driver, "Auditoría")
    await esperarTexto(driver, "LOGIN")
  })

  it("F-10 Cerrar sesión en escritorio", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await clic(driver, By.css('[data-slot="sidebar-footer"] button'))
    await clic(driver, boton("Cerrar sesión"))
    await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), ESPERA)
  })

  it("F-11 El Inicio no repite el acceso a los módulos (observación del docente)", async () => {
    for (const usuario of ["dr.diaz", "admin"]) {
      await entrarYEsperar(driver, usuario)
      const enContenido = await driver.findElements(By.css("#contenido button, #contenido a"))
      assert.equal(enContenido.length, 0, `${usuario}: el Inicio no debe tener botones hacia módulos`)
      await clic(driver, By.css('[data-slot="sidebar-footer"] button'))
      await clic(driver, boton("Cerrar sesión"))
      await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), ESPERA)
    }
  })

  it("F-12 Asistente clínico: responde citando la fuente (RF-06, HU010)", async () => {
    await entrarYEsperar(driver, "dr.diaz")
    await menu(driver, "Pacientes")
    await buscarPaciente(driver, "45678912")
    await clic(driver, porTexto("Quispe Mamani", "tr"))
    await clic(driver, boton("Asistente"))
    const caja = await driver.wait(until.elementLocated(By.css('textarea[aria-label="Pregunta para el asistente"]')), ESPERA)
    await caja.sendKeys("¿Tiene alergias?\n")
    await esperarTexto(driver, "Fuentes:", 60000)
    await esperarTexto(driver, "Penicilina")
    await capturar(driver, "F-12-asistente")
  })

  it("F-13 Registro de un paciente nuevo desde admisión (RF-02, CP-07)", async function () {
    if (SOLO_LECTURA) this.skip()
    await entrarYEsperar(driver, "admision.demo")
    await menu(driver, "Pacientes")
    await clic(driver, boton("Registrar paciente"))
    const dni = String(80000000 + Math.floor(Math.random() * 9999999))
    const escribir = async (nombre, valor) =>
      (await driver.wait(until.elementLocated(By.css(`input[name="${nombre}"]`)), ESPERA)).sendKeys(valor)
    await escribir("numeroDocumento", dni)
    await escribir("nombres", "Selenia")
    await escribir("apellidoPaterno", "Prueba")
    await driver.executeScript(`
      const campo = document.querySelector('input[name="fechaNacimiento"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(campo, "1990-05-20")
      campo.dispatchEvent(new Event("input", { bubbles: true }))`)
    await driver.findElement(By.css('select[name="sexo"]')).sendKeys("Femenino")
    await capturar(driver, "F-13-registro")
    await clic(driver, By.css('#contenido button[type="submit"]'))
    await esperarTexto(driver, "Prueba")
    await esperarTexto(driver, "HC-")
  })
})
