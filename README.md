# HistoriaMed — Frontend

Interfaz web del sistema de historias clínicas **HistoriaMed**. React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui.

## Requisitos

- Node.js 20 o superior y **pnpm**.
- El backend corriendo en `http://localhost:8080` (ver `backend/README.md`).

## Ejecutar

```powershell
pnpm install
pnpm dev
```

Abrir `http://localhost:5173`. Vite reenvía las llamadas a `/api` al backend (ver `vite.config.ts`): el navegador ve un
solo origen, así la cookie de sesión funciona sin configurar CORS.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compila para producción en `dist/` |
| `pnpm typecheck` | Verifica tipos de TypeScript |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/auth` | Sesión: login, renovación automática del token, cambio de contraseña |
| `src/lib` | Cliente de la API, tipos, hooks (`useApi`, `useDebounce`, `useReloj`) y fechas |
| `src/components` | Formularios y etiquetas reutilizables; `ui/` son componentes de shadcn |
| `src/pages` | Pantallas por módulo: pacientes, citas y colas, triaje, atención, documentos, usuarios, reportes… |

## Cómo maneja la sesión

- El **access token** vive solo en memoria (no en `localStorage`).
- El **refresh token** está en una cookie `httpOnly` que JavaScript no puede leer; al recargar la página la sesión se
  recupera con ella, y el token se renueva solo cuando vence.
- El menú y las acciones se muestran según el rol, pero **quien decide los permisos es el backend**.
