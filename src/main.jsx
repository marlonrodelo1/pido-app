import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'

// Capacitor: la app nativa arranca directo en /app (sin landing)
if (Capacitor.isNativePlatform() && window.location.pathname === '/') {
  window.history.replaceState(null, '', '/app')
}

// Validar variables de entorno críticas (sin ellas la app no funciona)
const criticalEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
const missingVars = criticalEnvVars.filter(key => !import.meta.env[key])
if (missingVars.length > 0) {
  const root = document.getElementById('root')
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;background:#FAFAF7;color:#DC2626;font-family:sans-serif;padding:20px;text-align:center'
  const inner = document.createElement('div')
  const h2 = document.createElement('h2')
  h2.textContent = 'Error de configuración'
  const p = document.createElement('p')
  p.textContent = 'Variables faltantes: ' + missingVars.join(', ')
  inner.appendChild(h2)
  inner.appendChild(p)
  wrap.appendChild(inner)
  root.appendChild(wrap)
  throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`)
}
// Avisar de variables opcionales (no bloquean la app)
const optionalEnvVars = ['VITE_STRIPE_PUBLISHABLE_KEY', 'VITE_GOOGLE_MAPS_API_KEY']
for (const key of optionalEnvVars) {
  if (!import.meta.env[key]) console.warn(`Variable de entorno opcional no encontrada: ${key}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
