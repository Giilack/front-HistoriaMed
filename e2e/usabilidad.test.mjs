// Pruebas de usabilidad y accesibilidad: axe-core (reglas WCAG 2.1 AA) e interacción real con teclado y toque.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import AxeBuilder from "@axe-core/webdriverjs"
import { By, Key, until } from "selenium-webdriver"

import {
  BASE,
  CELULAR,
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

const REPORTE = process.env.E2E_REPORTE_AXE ?? "e2e/resultados/axe.json"
const resultadosAxe = []

async function revisarAxe(driver, pantalla) {
  const r = await new AxeBuilder(driver).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
  resultadosAxe.push({
    pantalla,
    reglasAprobadas: r.passes.length,
    violaciones: r.violations.map((v) => ({ id: v.id, impacto: v.impact, elementos: v.nodes.length, ayuda: v.help })),
  })
  const graves = r.violations.filter((v) => ["critical", "serious"].includes(v.impact))
  assert.deepEqual(graves.map((v) => `${v.id}: ${v.nodes[0]?.target}`), [], `Violaciones graves en ${pantalla}`)
}

describe("Usabilidad y accesibilidad", function () {
  this.timeout(180000)
  let driver

  afterEach(async function () {
    await capturarSiFallo(this, driver)
    await driver.quit()
  })

  after(() => {
    fs.mkdirSync(path.dirname(REPORTE), { recursive: true })
    fs.writeFileSync(REPORTE, JSON.stringify(resultadosAxe, null, 2))
  })

  describe("Accesibilidad automática (axe-core, WCAG 2.1 AA)", () => {
    beforeEach(async () => {
      driver = await abrirNavegador()
    })

    it("U-01 Pantalla de inicio de sesión", async () => {
      await driver.get(BASE)
      await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), 90000)
      await revisarAxe(driver, "Inicio de sesión")
    })

    it("U-02 Panel de admisión y citas", async () => {
      await entrarYEsperar(driver, "admision.demo")
      await esperarTexto(driver, "Citas de hoy")
      await revisarAxe(driver, "Inicio de admisión")
      await menu(driver, "Citas")
      await driver.sleep(1500)
      await revisarAxe(driver, "Citas")
    })

    it("U-03 Panel de triaje y cola", async () => {
      await entrarYEsperar(driver, "triaje.demo")
      await revisarAxe(driver, "Inicio de triaje")
      await menu(driver, "Cola de triaje")
      await driver.sleep(1500)
      await revisarAxe(driver, "Cola de triaje")
    })

    it("U-04 Médico: inicio, pacientes y ficha", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await revisarAxe(driver, "Inicio del médico")
      await menu(driver, "Pacientes")
      await buscarPaciente(driver, "45678912")
      await esperarTexto(driver, "Quispe Mamani")
      await revisarAxe(driver, "Búsqueda de pacientes")
      await clic(driver, porTexto("Quispe Mamani", "tr"))
      await clic(driver, boton("Resumen clínico"))
      await esperarTexto(driver, "Penicilina")
      await revisarAxe(driver, "Ficha del paciente")
    })

    it("U-05 Administración: usuarios, reportes y auditoría", async () => {
      await entrarYEsperar(driver, "admin")
      for (const modulo of ["Usuarios", "Consultorios", "Reportes", "Auditoría"]) {
        await menu(driver, modulo)
        await driver.sleep(1500)
        await revisarAxe(driver, modulo)
      }
    })
  })

  describe("Celular", () => {
    beforeEach(async () => {
      driver = await abrirNavegador(CELULAR)
    })

    it("U-06 Se puede cerrar sesión desde el celular (observación del docente)", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await clic(driver, By.css('[data-slot="sidebar-trigger"]'))
      await driver.sleep(500)
      await capturar(driver, "U-06-menu-celular")
      const salir = await driver.wait(until.elementLocated(boton("Cerrar sesión")), ESPERA)
      const caja = await salir.getRect()
      const ventana = await driver.executeScript("return { w: innerWidth, h: innerHeight }")
      assert.ok(caja.x >= 0 && caja.x + caja.width <= ventana.w, "«Cerrar sesión» debe caber a lo ancho")
      assert.ok(caja.y >= 0 && caja.y + caja.height <= ventana.h, "«Cerrar sesión» debe caber a lo alto")
      await salir.click()
      await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), ESPERA)
    })

    it("U-07 Elegir una opción cierra el menú del celular", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await clic(driver, By.css('[data-slot="sidebar-trigger"]'))
      await menu(driver, "Pacientes")
      await driver.wait(until.elementLocated(By.css('input[placeholder*="45678912"]')), ESPERA)
      await driver.sleep(500)
      const visibles = await driver.findElements(By.css('[data-mobile="true"]'))
      assert.equal(visibles.length, 0, "El panel del menú debe cerrarse")
    })

    it("U-08 Ninguna pantalla obliga a desplazarse de lado", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      const sobra = await driver.executeScript("return document.documentElement.scrollWidth - innerWidth")
      assert.ok(sobra <= 1, `Sobran ${sobra} px a lo ancho`)
      await capturar(driver, "U-08-inicio-celular")
    })

    it("U-09 Los botones del menú tienen un tamaño cómodo al tacto (44 px)", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await clic(driver, By.css('[data-slot="sidebar-trigger"]'))
      await driver.sleep(500)
      const salir = await driver.wait(until.elementLocated(boton("Cerrar sesión")), ESPERA)
      assert.ok((await salir.getRect()).height >= 44)
    })
  })

  describe("Inclusión e interacción", () => {
    beforeEach(async () => {
      driver = await abrirNavegador()
    })

    const abrirPanel = async () => {
      await clic(driver, By.css('[aria-label="Opciones de accesibilidad"]'))
      await esperarTexto(driver, "Tamaño del texto")
    }

    it("U-10 Con teclado, lo primero es saltar al contenido", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await driver.findElement(By.css("body")).sendKeys(Key.TAB)
      const activo = await driver.switchTo().activeElement()
      assert.match(await activo.getText(), /Saltar al contenido/)
      await activo.sendKeys(Key.ENTER)
      await capturar(driver, "U-10-salto-contenido")
    })

    it("U-11 Se puede iniciar sesión solo con el teclado", async () => {
      await driver.get(BASE)
      const usuario = await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), 90000)
      await usuario.sendKeys("dr.diaz", Key.TAB, process.env.E2E_PASSWORD, Key.ENTER)
      await driver.wait(until.elementLocated(By.id("contenido")), 90000)
    })

    it("U-12 El tamaño de texto crece y se recuerda al volver a entrar", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      const tamano = () => driver.executeScript("return parseFloat(getComputedStyle(document.documentElement).fontSize)")
      const antes = await tamano()
      await abrirPanel()
      await clic(driver, By.css('[aria-label="Texto muy grande"]'))
      assert.ok((await tamano()) > antes)
      await capturar(driver, "U-12-texto-grande")
      await driver.navigate().refresh()
      await driver.wait(until.elementLocated(By.id("contenido")), ESPERA)
      assert.ok((await tamano()) > antes, "La preferencia debe conservarse")
    })

    it("U-13 Con alto contraste no quedan fallas de contraste", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await abrirPanel()
      await clic(driver, porTexto("Alto contraste", "label"))
      await driver.findElement(By.css("body")).sendKeys(Key.ESCAPE)
      await driver.sleep(500)
      await capturar(driver, "U-13-alto-contraste")
      await revisarAxe(driver, "Inicio con alto contraste")
    })

    it("U-14 El panel de accesibilidad está antes de iniciar sesión", async () => {
      await driver.get(BASE)
      await driver.wait(until.elementLocated(By.css('[aria-label="Opciones de accesibilidad"]')), 90000)
    })

    it("U-15 Cada pantalla tiene su título (ubicación para lectores de pantalla)", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await menu(driver, "Pacientes")
      await driver.wait(async () => (await driver.getTitle()).startsWith("Pacientes"), ESPERA)
    })

    it("U-16 Prevención de errores: enviar el login vacío no llama al servidor", async () => {
      await driver.get(BASE)
      await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 90000)
      await driver.findElement(By.css('button[type="submit"]')).click()
      await driver.sleep(500)
      assert.equal(await driver.findElement(By.css('input[autocomplete="username"]')).isDisplayed(), true)
      const invalido = await driver.executeScript("return document.querySelector('input[autocomplete=\"username\"]').validity.valid")
      assert.equal(invalido, false)
    })

    it("U-17 Prevención de errores: el aviso de contraseña incorrecta se anuncia", async () => {
      await entrar(driver, "usuario.inexistente", "Incorrecta123")
      const alerta = await driver.wait(until.elementLocated(By.css('[role="alert"]')), 90000)
      assert.ok((await alerta.getText()).length > 0)
    })

    it("U-18 Asistencia: el asistente propone preguntas de ejemplo", async () => {
      await entrarYEsperar(driver, "dr.diaz")
      await menu(driver, "Pacientes")
      await buscarPaciente(driver, "45678912")
      await clic(driver, porTexto("Quispe Mamani", "tr"))
      await clic(driver, boton("Asistente"))
      await esperarTexto(driver, "¿Tiene alergias?")
      await capturar(driver, "U-18-asistente-ayuda")
      await revisarAxe(driver, "Asistente clínico")
    })
  })
})
