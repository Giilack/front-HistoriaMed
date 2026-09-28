import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { AuthProvider } from "@/auth/AuthContext"
import { ConfirmacionProvider } from "@/components/Confirmacion"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <ConfirmacionProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfirmacionProvider>
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
