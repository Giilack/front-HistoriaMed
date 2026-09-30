import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Si el 5173 está ocupado, falla con un mensaje claro en lugar de pasar al 5174: el backend solo
    // acepta peticiones desde http://localhost:5173 y desde otro puerto el login respondería 403.
    strictPort: true,
    // Las llamadas a /api se reenvían al backend: el navegador ve un solo origen,
    // así la cookie de sesión (SameSite=Strict) funciona sin configurar CORS.
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
})
