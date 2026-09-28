import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Las llamadas a /api se reenvían al backend: el navegador ve un solo origen,
    // así la cookie de sesión (SameSite=Strict) funciona sin configurar CORS.
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
})
